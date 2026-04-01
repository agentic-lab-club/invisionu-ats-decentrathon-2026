# 🚀 FastAPI LLM Leadership Assessment — Руководство запуска

## Предварительные требования

- Python 3.10+
- PostgreSQL 14+ с поддержкой pgvector
- OpenAI API ключ (https://platform.openai.com/api-keys)

---

## 📦 Установка

### 1. Клонирование и setup

```bash
git clone <repo>
cd llm-assessment-api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements_production.txt
```

### 2. PostgreSQL + pgvector

```bash
# Создать БД
createdb llm_assessment

# Подключиться и добавить расширение
psql llm_assessment
# Внутри psql:
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

### 3. Конфигурация окружения

```bash
cp .env.example .env
# Отредактировать .env:
# - OPENAI_API_KEY=sk-...
# - DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/llm_assessment
```

### 4. Запуск API

```bash
uvicorn main_improved:app --reload --port 8000
```

API будет доступен на http://localhost:8000  
Docs (Swagger): http://localhost:8000/docs

---

## 📡 Workflow — примеры запросов

### **Шаг 1️⃣: Генерация вопросов**

```bash
curl -X POST http://localhost:8000/generate-questions \
  -H "Content-Type: application/json" \
  -d '{
    "specialization": "Backend Engineer (Java/Spring Boot)",
    "num_questions": 5,
    "user_id": 123
  }'
```

**Ответ:**
```json
{
  "session_id": 1,
  "questions": [
    "Ты возглавляешь команду из 5 backend-инженеров. На prod падает сервис, обрабатывающий платежи. RTO — 5 минут. Как ты действуешь?",
    "Спроектируй архитектуру для системы, обрабатывающей 1 млн транзакций в день с гарантией konsistency. Какие trade-offs ты выберешь и почему?",
    ...
  ],
  "expires_at": "2024-01-15T15:30:00",
  "timeout_minutes": 15
}
```

**Сохрани `session_id` — он нужен для следующих шагов!**

---

### **Шаг 2️⃣: Проверка статуса сессии** (опционально)

```bash
curl http://localhost:8000/session/1
```

**Ответ:**
```json
{
  "session_id": 1,
  "status": "active",
  "time_remaining_seconds": 847,
  "questions_count": 5,
  "has_answers": false,
  "evaluation": null
}
```

---

### **Шаг 3️⃣: Абитуриент отвечает на вопросы**

*Абитуриент ответил на все 5 вопросов в течение 15 минут...*

```bash
curl -X POST http://localhost:8000/submit-answers \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "answers": [
      "Сначала я бы собрал инцидент-команду: инженера, dev-ops, database-специалиста. Провел бы быструю диагностику через логи и метрики. Параллельно — подготовка fallback. Приоритет: восстановить доступность любой ценой, даже если потеряем часть данных (eventual consistency).",
      "Выбрал бы Event Sourcing + CQRS с Kafka для асинхронности. Read-model в PostgreSQL, write-model может быть в ScyllaDB для масштабируемости. Sacrifice strong consistency для availability, используя compensating transactions.",
      ...
    ]
  }'
```

**Ответ:**
```json
{
  "status": "ok",
  "message": "Ответы сохранены. Можно запускать оценку.",
  "session_id": 1
}
```

---

### **Шаг 4️⃣: Оценка ответов LLM**

```bash
curl -X POST http://localhost:8000/evaluate?session_id=1
```

**Ответ:**
```json
{
  "overall_score": 82,
  "leadership_score": 87,
  "reason": "Кандидат демонстрирует глубокие знания distributed systems и практический опыт. Лидерский потенциал высокий: быстро структурирует кризис, делегирует, думает стратегически.",
  "detailed_feedback": "✅ Сильные стороны:\n- Быстрое принятие решений под давлением\n- Знание trade-offs между consistency/availability\n- Умение строить team communication\n\n⚠️ Площадка для развития:\n- Мог бы глубже обсудить мониторинг и alerting\n- Меньше внимания постэкспертизе (post-mortem)\n\n🎯 Лидерский потенциал: готов к роли Tech Lead или Engineering Manager. Стиль: decisive + collaborative.",
  "evaluated_at": "2024-01-15T15:27:45"
}
```

---

## 🔍 Проверка результатов в БД

```sql
-- Посмотреть все сессии
SELECT id, specialization, status, overall_score, leadership_score, created_at
FROM assessment_sessions
ORDER BY created_at DESC;

-- Посмотреть банк уникальных вопросов
SELECT id, text, specialization, usage_count, created_at
FROM question_bank
ORDER BY created_at DESC;

-- Посмотреть audit (сырые ответы LLM)
SELECT session_id, llm_input_prompt, llm_raw_response
FROM evaluation_audit
WHERE session_id = 1;
```

---

## 🎯 Оптимизация токенов

| Фаза | LLM модель | Примерная стоимость |
|------|-----------|-------------------|
| Генерация 5 вопросов | gpt-4o-mini | ~$0.03 |
| Embedding для проверки уникальности (5 вопросов) | text-embedding-3-small | ~$0.0001 |
| Оценка ответов | gpt-4o-mini | ~$0.05 |
| **Итого на 1 кандидата** | — | **~$0.08** |

→ **В 10 раз дешевле, чем gpt-4 + text-embedding-3-large**

---

## 📊 Фичи реализации

✅ **Уникальность вопросов**  
- pgvector + cosine distance (порог настраивается)
- Вопросы сохраняются в question_bank → переиспользуются

✅ **Таймер 15 минут**  
- Встроен в expires_at
- Проверка при submit-answers и evaluate

✅ **Лидерский балл**  
- Отдельная метрика (0-100)
- Контекст специализации учитывается в промпте

✅ **Retry-логика**  
- Tenacity для API-ошибок (rate limit, timeout)
- Экспоненциальный backoff

✅ **Логирование**  
- Все события: генерация, submit, оценка
- Audit-таблица для отладки LLM-ответов

✅ **Обработка ошибок**  
- Валидация Pydantic
- Graceful fallback (если вопрос не прошел фильтр уникальности)

---

## 🐛 Отладка

### Включить логи
```bash
export LOG_LEVEL=DEBUG
uvicorn main_improved:app --reload --log-level debug
```

### Проверить embedding
```python
from main_improved import get_embedding
print(get_embedding("Какой вопрос?"))
# Output: [0.123, -0.456, ...]  длина 1536
```

### Посмотреть сырой ответ LLM
```sql
SELECT llm_raw_response FROM evaluation_audit WHERE session_id = 1;
```

---

## 🚀 Production deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements_production.txt .
RUN pip install --no-cache-dir -r requirements_production.txt

COPY . .
CMD ["uvicorn", "main_improved:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t llm-assessment .
docker run -p 8000:8000 --env-file .env llm-assessment
```

### Настройка NGINX (reverse proxy)

```nginx
upstream api {
    server localhost:8000;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📝 API endpoints summary

| Метод | Endpoint | Описание |
|-------|----------|---------|
| POST | `/generate-questions` | Генерирует вопросы, создает сессию |
| GET | `/session/{id}` | Статус сессии (время, статус, оценка) |
| POST | `/submit-answers` | Абитуриент отправляет ответы |
| POST | `/evaluate` | LLM оценивает ответы |
| GET | `/health` | Проверка здоровья API |

---

## ✅ Чеклист перед production

- [ ] .env заполнен (OPENAI_API_KEY, DATABASE_URL)
- [ ] PostgreSQL running + pgvector extension установлен
- [ ] Тесты пройдены
- [ ] Логирование настроено (LOG_LEVEL=INFO)
- [ ] Database backups настроены
- [ ] Rate limiting добавлен (если требуется)
- [ ] Monitoring + alerts (например, Datadog)
- [ ] SSL/TLS сертификаты (если фронтенд HTTPS)

---

## 📞 Поддержка

Если что-то не работает:
1. Проверь логи API: `tail -f app.log`
2. Проверь БД: `psql llm_assessment -c "SELECT COUNT(*) FROM assessment_sessions"`
3. Проверь OpenAI API key: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`
