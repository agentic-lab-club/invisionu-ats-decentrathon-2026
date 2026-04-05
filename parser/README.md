# PDF Score Parser API

FastAPI-сервис для извлечения `ENT` или `IELTS` score из PDF по ссылке или локальному файлу.

## Что делает

- Принимает источник PDF (`file_url`):
  - `http(s)` ссылка,
  - локальный путь,
  - имя файла из папки `input_pdfs/`.
- Принимает тип результата (`score_type`: `ENT` или `IELTS`)
- Возвращает JSON в формате:

```json
{
  "score": 42,
  "status": "ok",
  "error": null
}
```

Поддерживается алиас `IESLTS` -> `IELTS`.

## Файлы

- `main.py` — FastAPI приложение
- `requirements.txt` — зависимости
- `Dockerfile` — образ сервиса
- `docker-compose.yml` — запуск контейнера

## Локальный запуск (без Docker)

1. Установить зависимости:

```bash
pip install -r requirements.txt
```

2. Запустить API:

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## Запуск в Docker

Из папки `parser`:

```bash
docker compose up --build
```

В Docker автоматически монтируется папка `./input_pdfs` в контейнер как `/app/input_pdfs`.

API будет доступен: `http://localhost:8001`

## Эндпоинты

### GET /health

Проверка состояния.

Ответ:

```json
{"status":"ok"}
```

### POST /parse-score

Тело запроса:

```json
{
  "file_url": "https://example.com/file.pdf",
  "score_type": "ENT"
}
```

или локальный файл (из папки `input_pdfs`):

```json
{
  "file_url": "1-2025-32-003904212-2-1.pdf",
  "score_type": "ENT"
}
```

или

```json
{
  "file_url": "https://example.com/file.pdf",
  "score_type": "IELTS"
}
```

Ответ:

```json
{
  "score": 5.5,
  "status": "ok",
  "error": null
}
```

Если значение не найдено:

```json
{
  "score": null,
  "status": "not_found",
  "error": "..."
}
```

## Как получать файлы из MinIO

Есть 2 рабочих способа.

### 1) Рекомендуется: Presigned URL из MinIO

1. Сгенерируй presigned URL на PDF в MinIO.
2. Передай этот URL в `file_url`.

Пример запроса в API:

```json
{
  "file_url": "https://minio.example.com/bucket/docs/file.pdf?X-Amz-Algorithm=...",
  "score_type": "ENT"
}
```

Плюс этого подхода: сервису не нужны логин/пароль MinIO.

### 2) Приватный MinIO: скачать файл заранее

Если нельзя выдавать presigned URL:

1. Скачай объект из MinIO в локальную папку `parser/input_pdfs/`.
2. Передай в API имя файла:

```json
{
  "file_url": "my-file.pdf",
  "score_type": "IELTS"
}
```

### Важно для Docker

- В `docker-compose.yml` уже есть монтирование `./input_pdfs:/app/input_pdfs`.
- Поэтому файлы, загруженные в `parser/input_pdfs/`, доступны контейнеру.
- Если используешь внутренний адрес MinIO (например, `http://minio:9000/...`), контейнер parser должен быть в той же docker-сети.
