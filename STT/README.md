# STT Service (Whisper via Groq API)

Сервис транскрибации аудио в текст для пайплайна ATS.
Использует модель **`whisper-large-v3-turbo`** через **Groq API**.

---

## Что делает сервис

- Принимает presigned URL аудиофайла (`file_url`)
- Сам скачивает аудио по URL
- Отправляет файл в Groq Whisper API
- Удаляет/анонимизирует персональные данные через Microsoft Presidio
- Возвращает очищенный распознанный текст в JSON

---

## Стек

- Python 3.11
- FastAPI + Uvicorn
- groq SDK
- python-dotenv
- Microsoft Presidio (analyzer + anonymizer)

---

## Структура

- `main.py` — логика загрузки `.env`, клиент Groq, транскрибация
- `main_api.py` — HTTP API (FastAPI)
- `Dockerfile` / `docker-compose.yml` — контейнеризация
- `.env.example` — пример переменных окружения

---


## Локальный запуск

1. Установить зависимости:

```bash
pip install -r requirements.txt
```

2. Запустить API:

```bash
uvicorn main_api:app --host 0.0.0.0 --port 9095
```

Сервис будет доступен на `http://localhost:9095`.

---

## Запуск в Docker

```bash
docker compose up --build
```

Порт: `9095:9095`

---

## API

### POST `/transcribe`

Тело запроса:

```json
{
  "file_url": "https://signed-object-url/audio.mp3?X-Amz-Signature=..."
}
```

Успешный ответ (`200`):

```json
{
  "text": "recognized speech..."
}
```

Ошибки:

- `400` — некорректный URL
- `502` — не удалось скачать файл или выполнить транскрибацию
- `500` — внутренняя ошибка сервиса

---

## Пример запроса

```bash
curl -X POST http://localhost:9095/transcribe \
  -H "Content-Type: application/json" \
  -d '{"file_url":"https://signed-object-url/audio.mp3?X-Amz-Signature=..."}'
```

---
