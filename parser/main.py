from __future__ import annotations

import re
import tempfile
import urllib.request
from urllib.parse import urlparse
from pathlib import Path
from typing import Optional, Union

import fitz  # PyMuPDF
import pdfplumber
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="PDF Score Parser", version="1.0.0")


class ScoreRequest(BaseModel):
    file_url: str = Field(..., description="Прямая ссылка на PDF файл")
    score_type: str = Field(..., description="ENT / IELTS (допускается IESLTS)")


class ScoreResponse(BaseModel):
    score: Optional[Union[int, float]]
    status: str
    error: Optional[str]


def _download_pdf(file_url: str) -> Path:
    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp_path = Path(tmp.name)
    tmp.close()

    urllib.request.urlretrieve(file_url, tmp_path)
    return tmp_path


def _resolve_pdf_path(file_ref: str) -> tuple[Path, bool]:
    """
    Возвращает (path, is_temp_file).
    Поддерживает:
    - http/https URL
    - file:// URL
    - локальный путь к PDF
    - только имя файла (ищется в ./input_pdfs)
    """
    value = file_ref.strip()
    parsed = urlparse(value)

    # URL источник
    if parsed.scheme in {"http", "https"}:
        return _download_pdf(value), True

    # file:// URL
    if parsed.scheme == "file":
        candidate = Path(parsed.path)
        if candidate.exists() and candidate.is_file():
            return candidate, False
        raise FileNotFoundError(f"Локальный файл не найден: {candidate}")

    # Локальный путь
    local_candidate = Path(value)
    if local_candidate.exists() and local_candidate.is_file():
        return local_candidate, False

    # Только имя файла -> пробуем папку input_pdfs
    input_dir_candidate = Path("./input_pdfs") / value
    if input_dir_candidate.exists() and input_dir_candidate.is_file():
        return input_dir_candidate, False

    raise FileNotFoundError(
        f"PDF не найден. Передай http(s)-ссылку или путь к существующему файлу: {value}"
    )


def _extract_text_pymupdf(pdf_path: Path) -> str:
    with fitz.open(pdf_path) as doc:
        return "\n".join((page.get_text("text") or "") for page in doc).strip()


def _extract_text_pdfplumber(pdf_path: Path) -> str:
    with pdfplumber.open(pdf_path) as doc:
        return "\n".join((page.extract_text() or "") for page in doc.pages).strip()


def _extract_text(pdf_path: Path) -> str:
    text = ""
    try:
        text = _extract_text_pymupdf(pdf_path)
    except Exception:
        text = ""

    if text.strip():
        return text

    try:
        text = _extract_text_pdfplumber(pdf_path)
    except Exception:
        text = ""

    return text


def _preprocess_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def _normalize_ielts_score(raw: str) -> Optional[float]:
    raw = re.sub(r"\s+", "", raw).replace(",", ".")
    try:
        score = float(raw)
    except ValueError:
        return None

    if not (0.0 <= score <= 9.0):
        return None
    if abs(score * 2 - round(score * 2)) > 1e-9:
        return None
    return score


def _extract_ielts(text: str) -> Optional[float]:
    text_l = text.lower()
    patterns = [
        r"overall\s*band\s*score\D{0,25}([0-9](?:[\.,][0-9])?)",
        r"overall\D{0,20}([0-9](?:[\.,][0-9])?)",
        r"ielts\D{0,40}overall\D{0,20}([0-9](?:[\.,][0-9])?)",
    ]

    for pattern in patterns:
        m = re.search(pattern, text_l, flags=re.IGNORECASE)
        if m:
            score = _normalize_ielts_score(m.group(1))
            if score is not None:
                return score

    kw = re.search(r"overall\s*band\s*score|overall", text_l)
    if not kw:
        return None

    for m in re.finditer(r"\b([0-9](?:[\.,][0-9])?)\b", text):
        score = _normalize_ielts_score(m.group(1))
        if score is not None and m.start() > kw.start():
            return score

    return None


def _normalize_ent_score(raw: str) -> Optional[int]:
    digits = re.sub(r"\D+", "", raw)
    if not digits:
        return None
    score = int(digits)
    if 0 <= score <= 140:
        return score
    return None


def _extract_ent(text: str) -> Optional[int]:
    text_l = text.lower()
    patterns = [
        r"(?:ент|ен\s*т|unt)\s*[:\-]?\s*([0-9]{2,3})",
        r"(?:итог(?:овый)?\s*балл|общий\s*балл|total\s*score)\s*[:\-]?\s*([0-9]{2,3})",
        r"\b([0-9]{1,3})\b\s*(?:барлығы|итого|всего|total)\b",
    ]

    for pattern in patterns:
        m = re.search(pattern, text_l, flags=re.IGNORECASE)
        if m:
            score = _normalize_ent_score(m.group(1))
            if score is not None:
                return score

    keyword = re.search(r"барлығы|итого|всего|total", text_l)
    if keyword:
        kpos = keyword.start()
        candidates = []
        for m in re.finditer(r"\b([0-9]{1,3})\b", text):
            score = _normalize_ent_score(m.group(1))
            if score is not None:
                candidates.append((m.start(), score))

        prev = [(pos, s) for pos, s in candidates if pos < kpos and kpos - pos <= 120]
        if prev:
            prev.sort(key=lambda x: kpos - x[0])
            return prev[0][1]

    return None


def _normalize_score_type(score_type: str) -> str:
    t = score_type.strip().upper()
    aliases = {
        "IESLTS": "IELTS",
        "IELTS": "IELTS",
        "ENT": "ENT",
    }
    return aliases.get(t, t)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/parse-score", response_model=ScoreResponse)
def parse_score(payload: ScoreRequest) -> ScoreResponse:
    pdf_path: Optional[Path] = None
    is_temp_file = False
    try:
        exam_type = _normalize_score_type(payload.score_type)
        if exam_type not in {"ENT", "IELTS"}:
            return ScoreResponse(score=None, status="error", error="Неверный type. Используй ENT или IELTS")

        pdf_path, is_temp_file = _resolve_pdf_path(payload.file_url)
        text = _preprocess_text(_extract_text(pdf_path))

        if not text:
            return ScoreResponse(score=None, status="error", error="Не удалось извлечь текст из PDF")

        if exam_type == "ENT":
            score = _extract_ent(text)
            if score is None:
                return ScoreResponse(score=None, status="not_found", error="ЕНТ балл не найден")
            return ScoreResponse(score=score, status="ok", error=None)

        score = _extract_ielts(text)
        if score is None:
            return ScoreResponse(score=None, status="not_found", error="IELTS score не найден")
        return ScoreResponse(score=score, status="ok", error=None)

    except Exception as e:
        return ScoreResponse(score=None, status="error", error=str(e))
    finally:
        if is_temp_file and pdf_path and pdf_path.exists():
            pdf_path.unlink(missing_ok=True)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
