# STT Service (Whisper via Groq API)

Сервис транскрибации аудио в текст для пайплайна ATS.
Использует модель **`whisper-large-v3-turbo`** через **Groq API**.

---

## Что делает сервис

- Принимает путь к аудиофайлу (`filepath`) Заменить на get из s3
- Отправляет файл в Groq Whisper API
- Возвращает распознанный текст в JSON

---

## Стек

- Python 3.11
- FastAPI + Uvicorn
- groq SDK
- python-dotenv

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
  "filepath": "/absolute/path/to/audio.mp3"
}
```

Успешный ответ (`200`):

```json
{
  "text": "recognized speech..."
}
```

Ошибки:

- `404` — файл не найден
- `500` — внутренняя ошибка (например, проблемы с API ключом/провайдером)

---

## Пример запроса

```bash
curl -X POST http://localhost:9095/transcribe \
  -H "Content-Type: application/json" \
  -d '{"filepath":"/absolute/path/to/audio.mp3"}'
```

---