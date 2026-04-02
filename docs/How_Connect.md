# Интеграция пайплайна: STT -> LLM

Этот документ описывает, как разработчику (backend-команде) связать два сервиса FastAPI в единый пайплайн ATS:
1. **STT (Speech-to-Text)** — получает аудио, возвращает текст.
2. **LLM (Scoring)** — получает текст, возвращает структурированный анализ и скоринг кандидата.

---

## Архитектура пайплайна (Data Flow)

`[Audio File / S3 Path]` 
      ⬇
`POST http://stt:9095/transcribe`
      ⬇
`[Recognized Text (String)]`
      ⬇
`POST http://llm:9094/analyze`
      ⬇
`[Final JSON with Scores (AdmissionsPotential, Metrics, etc.)]`

---

## Шаг 1: Транскрибация (STT Service)

Сначала отправляется запрос в микросервис STT для перевода аудио в текст.

- **URL:** `http://<STT_HOST>:9095/transcribe`
- **Метод:** `POST`
- **Content-Type:** `application/json`

### Input (Request)
```json
{
  "filepath": "/absolute/path/to/audio.mp3" 
}
```
*(Примечание: в перспективе этот filepath должен указывать на скачанный файл из S3)*

### Output (Response)
```json
{
  "text": "why I apply to inVision U, because I feel I need this type environment..."
}
```

---

## Шаг 2: Обработка и скоринг (LLM Service)

Полученный текст отправляется в микросервис LLM для анализа ответов кандидата.

- **URL:** `http://<LLM_HOST>:9094/analyze`
- **Метод:** `POST`
- **Content-Type:** `application/json`

### Input (Request)
Поле `input_data` должно содержать значение поля `text`, которое мы получили на предыдущем шаге от STT сервиса.

```json
{
  "input_data": "why I apply to inVision U, because I feel I need this type environment..."
}
```

### Output (Response)
Сервис синхронно вернет большой JSON с результатами оценки кандидата, разбитым по вопросам, найденными цитатами и финальными оценками.

```json
{
    "workflow_status": "success",
    "stt_length": 4066,
    "candidate_breakdown": {
        "q1_text": "...",
        "q2_text": "..."
    },
    "llm_evaluations": { ... },
    "aggregated_metrics": {
        "Motivation": 3.35,
        "Planning": 2.85,
        "Resilience": 3.0,
        "Leadership": 3.1,
        "Values": 3.2,
        "Social_Support": 3.0
    },
    "global_score": {
        "LeadershipIndex": 3.08,
        "AdmissionsPotential": 3.08
    }
}
```

---

## Пример интеграции на Python (Псевдокод)

Вот пример того, как это должно выглядеть в вашем основном backend-сервисе:

```python
import httpx
from fastapi import HTTPException

async def process_candidate_audio(audio_filepath: str):
    # 1. Отправляем аудио в STT сервис
    stt_response = httpx.post(
        "http://stt-service:9095/transcribe", 
        json={"filepath": audio_filepath},
        timeout=120.0
    )
    
    if stt_response.status_code != 200:
        raise HTTPException(status_code=500, detail="Ошибка сервиса STT")
        
    recognized_text = stt_response.json().get("text")
    
    # 2. Отправляем текст в LLM сервис на скоринг
    llm_response = httpx.post(
        "http://llm-service:9094/analyze", 
        json={"input_data": recognized_text},
        timeout=300.0 # LLM может думать долго
    )
    
    if llm_response.status_code != 200:
        raise HTTPException(status_code=500, detail="Ошибка сервиса LLM")
        
    # 3. Возвращаем итоговый скоринг
    final_scoring = llm_response.json()
    return final_scoring
```
