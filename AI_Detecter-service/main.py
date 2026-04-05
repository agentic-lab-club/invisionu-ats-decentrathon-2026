import logging as log
import time
from pathlib import Path
from typing import Dict
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoConfig, AutoModel
from huggingface_hub import snapshot_download
from safetensors.torch import load_file

app = FastAPI(
    title="Ai-Detection-Service",
    description="Сервис для определения сгенерированного ИИ текста",
)

class TextInput(BaseModel):
    text: str

# 1. ЧИСТАЯ АРХИТЕКТУРА НА PYTORCH
# Наследуемся от обычного nn.Module, чтобы избежать багов библиотеки transformers
class DesklibAIDetectionModel(nn.Module):
    def __init__(self, config):
        super().__init__()
        # Загружаем "тело" модели без весов
        self.model = AutoModel.from_config(config)
        # Наш классификатор, который выдает 1 число
        self.classifier = nn.Linear(config.hidden_size, 1)

    def forward(self, input_ids, attention_mask=None, **kwargs):
        # Пропускаем через трансформер
        outputs = self.model(input_ids, attention_mask=attention_mask, **kwargs)
        last_hidden_state = outputs[0]

        # Умное усреднение (Mean Pooling) - именно так модель была обучена
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(last_hidden_state.size()).float()
        sum_embeddings = torch.sum(last_hidden_state * input_mask_expanded, dim=1)
        sum_mask = torch.clamp(input_mask_expanded.sum(dim=1), min=1e-9)
        mean_pooled_embeddings = sum_embeddings / sum_mask

        # Финальный вердикт
        logits = self.classifier(mean_pooled_embeddings)
        return logits

# Настраиваем логирование
log.basicConfig(level=log.INFO)
model_name = "desklib/ai-text-detector-v1.01"
model_snapshot_dir: Path | None = None

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
tokenizer = None
model = None


def _find_weights_file(snapshot_dir: Path) -> Path:
    weights_candidates = sorted(snapshot_dir.glob("*.safetensors"))
    if weights_candidates:
        return weights_candidates[0]

    raise FileNotFoundError(
        f"Не найден файл весов модели в {snapshot_dir}. Ожидался *.safetensors."
    )


def _download_model_snapshot(repo_id: str, retries: int = 3, retry_delay_seconds: int = 5) -> str:
    last_error: Exception | None = None

    for attempt in range(1, retries + 1):
        try:
            cached_path = snapshot_download(repo_id=repo_id, local_files_only=True)
            log.info("Используем локальный cache Hugging Face: %s", cached_path)
            return cached_path
        except Exception as cache_error:
            last_error = cache_error
            log.info("Локальный cache модели не найден, пробуем скачать snapshot: %s", cache_error)

        try:
            downloaded_path = snapshot_download(repo_id=repo_id)
            log.info("Snapshot модели успешно скачан: %s", downloaded_path)
            return downloaded_path
        except Exception as download_error:
            last_error = download_error
            if attempt < retries:
                wait_seconds = retry_delay_seconds * attempt
                log.warning(
                    "Не удалось скачать модель (попытка %s/%s). Повтор через %s сек.: %s",
                    attempt,
                    retries,
                    wait_seconds,
                    download_error,
                )
                time.sleep(wait_seconds)
            else:
                break

    raise RuntimeError(
        "Не удалось загрузить модель desklib/ai-text-detector-v1.01 "
        "ни из локального cache, ни с Hugging Face. "
        "Проверьте доступ к huggingface.co, наличие токена или предварительно заполненный cache."
    ) from last_error


def initialize_model() -> None:
    global tokenizer, model, model_snapshot_dir

    if tokenizer is not None and model is not None and model_snapshot_dir is not None:
        return

    log.info("Инициализируем AI detection модель %s", model_name)
    snapshot_path = Path(_download_model_snapshot(model_name))
    config = AutoConfig.from_pretrained(snapshot_path, local_files_only=True)
    tokenizer = AutoTokenizer.from_pretrained(snapshot_path, local_files_only=True)
    model = DesklibAIDetectionModel(config)

    log.info("Скачиваем и применяем оригинальные веса (safetensors)...")
    weights_path = _find_weights_file(snapshot_path)
    state_dict = load_file(weights_path)
    model.load_state_dict(state_dict, strict=False)

    model.to(device)
    model.eval()
    model_snapshot_dir = snapshot_path
    log.info("Модель успешно загружена на устройство: %s", device)


@app.on_event("startup")
def startup_event() -> None:
    initialize_model()


def smart_chunking(text: str, max_chars: int = 1500) -> list[str]:
    """Разбивает текст на абзацы, сохраняя контекст."""
    paragraphs = text.split('\n')
    chunks = []
    current_chunk = ""

    for p in paragraphs:
        p = p.strip()
        if not p:
            continue

        if len(current_chunk) + len(p) < max_chars:
            current_chunk += p + " "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = p + " "

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks



@app.get("/health")
async def health() :
    return {
        "status" : "ok"
    }


@app.post("/detect")
async def detect(request: TextInput) -> Dict:
    text = request.text.strip()

    if len(text) < 50:
        raise HTTPException(status_code=400, detail="Текст слишком короткий. Минимум 50 символов.")

    try:
        if tokenizer is None or model is None:
            raise RuntimeError("Модель не инициализирована")

        chunks = smart_chunking(text)
        if not chunks:
            chunks = [text]

        ai_probs = []

        with torch.no_grad():
            for chunk in chunks:
                inputs = tokenizer(
                    chunk,
                    return_tensors="pt",
                    truncation=True,
                    max_length=512,
                    padding=True
                )

                inputs = {k: v.to(device) for k, v in inputs.items()}

                # Модель возвращает логиты
                logits = model(**inputs)
                prob_ai = torch.sigmoid(logits).item()
                ai_probs.append(prob_ai)

        avg_ai_prob = sum(ai_probs) / len(ai_probs) if ai_probs else 0.5

        verdict = "Скорее всего сгенерировано ИИ" if avg_ai_prob > 0.5 else "Скорее всего написано человеком"

        return {
            "verdict": verdict,
            "ai_probs": round(float(avg_ai_prob) * 100, 2),
            "human_probability": round((1 - avg_ai_prob) * 100, 2),
            "chunks_analyzed": len(chunks),
            "model": model_name,
        }

    except Exception as e:
        log.exception("Ошибка при обработке текста")
        raise HTTPException(status_code=500, detail=f"Ошибка при обработке: {str(e)}")
