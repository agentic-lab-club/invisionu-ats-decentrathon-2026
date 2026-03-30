# LLM Scoring Service

Сервис оценки ответов кандидата для ATS-пайплайна.
Принимает текст (обычно после STT), отправляет его в LLM по заданному промпту и возвращает валидированный JSON-результат со скорингом.

---

## Роль в общей архитектуре

Speech / video
    ↓
STT → текст
    ↓
LLM / rules evaluator
    ↓
Scoring engine
    ↓
JSON результат
    ↓
UI / API / БД

---

## Что делает сервис

- Принимает `input_data` (текст интервью/ответов кандидата)
- Подставляет системный промпт из `prompt.txt`
- Вызывает модель Groq (`GROQ_MODEL`)
- Проверяет и валидирует формат ответа через `pydantic`
- Возвращает структурированный JSON со score/evidence/risk flags

---

## Стек

- Python 3.11
- FastAPI + Uvicorn
- Groq SDK
- Pydantic

---

## Структура

- `main.py` — основная логика скоринга, валидация JSON, интеграция с Groq
- `main_api.py` — HTTP API
- `prompt.txt` — системный промпт для модели
- `schema/` — схемы и логика агрегации  для v2
- `prompts/` — дополнительные промпты по вопросам для v2
- `Dockerfile` / `docker-compose.yml` — контейнеризация

---

## Локальный запуск

1. Установить зависимости:

```bash
pip install -r requirements.txt
```

2. Запустить API:

```bash
uvicorn main_api:app --host 0.0.0.0 --port 9094
```

Сервис будет доступен на `http://localhost:9094`.

---

## Запуск в Docker

```bash
docker compose up --build
```

Порт: `9094:9094`

---

## API

### POST `/analyze`

Тело запроса:

```json
{
  "input_data": "Candidate transcript text..."
}
```

Успешный ответ (`200`) содержит:

- `answer` — валидированный JSON со скорингом
- `model` — модель, использованная для оценки
- `attempt` — номер попытки, на которой получен валидный результат

При ошибке возвращается `500`.

---

## Пример запроса

```bash
curl -X POST http://localhost:9094/analyze \
  -H "Content-Type: application/json" \
  -d '{"input_data":"I want to join InVision U because..."}'
```

---

## Важные замечания

- `prompt.txt` обязателен для работы сервиса.
- Сервис ожидает, что ответ LLM будет JSON-объектом по ожидаемой структуре.
- Реализован retry-механизм при невалидном формате ответа модели.
