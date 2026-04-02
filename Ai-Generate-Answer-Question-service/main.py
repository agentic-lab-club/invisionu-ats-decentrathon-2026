import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from functools import lru_cache
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from sqlalchemy import create_engine, Column, Integer, String, Text, JSON, ARRAY, DateTime, Float, func, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from openai import OpenAI, APIError, RateLimitError
from dotenv import load_dotenv
import tenacity

load_dotenv()

# ====================== ЛОГИРОВАНИЕ ======================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ====================== НАСТРОЙКИ ======================
app = FastAPI(
    title="LLM Leadership Assessment API",
    version="1.0.0",
    description="Система оценки кандидатов с фокусом на лидерство и специализацию"
)

# API Keys & DB
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
ASSESSMENT_TIMEOUT_MINUTES = int(os.getenv("ASSESSMENT_TIMEOUT_MINUTES", "15"))

if not OPENAI_API_KEY or not DATABASE_URL:
    raise ValueError("Отсутствуют обязательные переменные окружения: OPENAI_API_KEY, DATABASE_URL")

client = OpenAI(api_key=OPENAI_API_KEY)

# SQLAlchemy
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ====================== МОДЕЛИ БД ======================
class AssessmentSession(Base):
    __tablename__ = "assessment_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    specialization = Column(String(255), index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    questions = Column(ARRAY(Text), nullable=False)
    answers = Column(ARRAY(Text), nullable=True)
    evaluation = Column(JSON, nullable=True)

    overall_score = Column(Float, nullable=True)
    leadership_score = Column(Float, nullable=True)

    status = Column(String(50), default="active")  # active, answered, evaluated, expired
    llm_raw_output = Column(Text, nullable=True)
    error_log = Column(Text, nullable=True)


class EvaluationAudit(Base):
    """Для отладки и аудита оценок"""
    __tablename__ = "evaluation_audit"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False, index=True)
    llm_input_prompt = Column(Text, nullable=False)
    llm_raw_response = Column(Text, nullable=False)
    parsed_result = Column(JSON, nullable=True)
    evaluation_timestamp = Column(DateTime, default=datetime.utcnow)
    evaluator_model = Column(String(100), default="gpt-4o-mini")


# ====================== ЗАПУСК БД ======================
@app.on_event("startup")
def startup_event():
    """Инициализация БД"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Таблицы БД созданы")
    except Exception as e:
        logger.error(f"❌ Ошибка создания таблиц: {e}")
        raise


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ====================== RETRY-ЛОГИКА ======================
@tenacity.retry(
    stop=tenacity.stop_after_attempt(2),
    wait=tenacity.wait_exponential(multiplier=1, min=1, max=5),
    retry=tenacity.retry_if_exception_type((RateLimitError, APIError))
)
def generate_questions_llm(specialization: str, num: int = 5) -> List[str]:
    """Генерация вопросов с retry и строгой валидацией"""
    prompt =\
f"""Ты — эксперт по {specialization}. Сгенерируй РОВНО {num} УНИКАЛЬНЫХ открытых вопросов для собеседования, которые одновременно проверяют:
1. **Глубокие знания этой** сферы {specialization}
2. **Лидерский потенциал** в серьёзных кейсах:
   - Управление кризисами и сложными ситуациями
   - Стратегическое принятие решений под неопределённостью
   - Управление командой и распределение ответственности
   - Видение долгосрочного развития
   - проерка на стресоустойчивасть

Вопросы должны быть:
- Оригинальными и сценарийными (не стандартными)
- Сложными (требуют глубокого анализа и примеров из практики)
- Контекстуальными для {specialization}

Ответ ТОЛЬКО валидный JSON:
{{"questions": ["Вопрос 1?", "Вопрос 2?", ...]}}"""

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.85,
            max_tokens=800,
            response_format={"type": "json_object"}
        )

        data = json.loads(resp.choices[0].message.content)
        questions = data.get("questions", [])

        # Валидация
        if not isinstance(questions, list) or len(questions) == 0:
            raise ValueError("Некорректный формат ответа LLM")

        questions = [q.strip() for q in questions if isinstance(q, str) and q.strip()]

        if len(questions) < num:
            logger.warning(f"LLM вернул {len(questions)} вопросов вместо {num}")

        return questions[:num]

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error in LLM response: {e}")
        raise ValueError("LLM вернул невалидный JSON")
    except Exception as e:
        logger.error(f"Error generating questions: {e}")
        raise


# ====================== PYDANTIC МОДЕЛИ ======================
class GenerateRequest(BaseModel):
    specialization: str = Field(..., min_length=2, max_length=100)
    num_questions: int = Field(default=5, ge=1, le=20)
    user_id: Optional[int] = None

    @validator('specialization')
    def validate_specialization(cls, v):
        return v.strip()


class GenerateResponse(BaseModel):
    session_id: int
    questions: List[str]
    expires_at: datetime
    timeout_minutes: int


class SubmitRequest(BaseModel):
    session_id: int
    answers: List[str] = Field(..., min_items=1)

    @validator('answers')
    def validate_answers(cls, v):
        return [a.strip() for a in v if isinstance(a, str)]


class EvalResponse(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    leadership_score: int = Field(..., ge=0, le=100)
    reason: str
    detailed_feedback: str
    evaluated_at: datetime


class SessionStatus(BaseModel):
    session_id: int
    status: str
    time_remaining_seconds: int
    questions_count: int
    has_answers: bool
    evaluation: Optional[EvalResponse] = None


# ====================== ENDPOINTS ======================

@app.post("/generate-questions", response_model=GenerateResponse)
def generate_questions(body: GenerateRequest, db: Session = Depends(get_db)):
    """
    POST /generate-questions
    Генерирует {num_questions} уникальных вопросов для {specialization}.
    Создаёт сессию с таймером {ASSESSMENT_TIMEOUT_MINUTES} минут.
    """
    logger.info(f"Generating {body.num_questions} questions for {body.specialization}")

    try:
        questions = generate_questions_llm(body.specialization, body.num_questions)
    except Exception as e:
        logger.error(f"Failed to generate questions: {e}")
        raise HTTPException(500, "Не удалось сгенерировать вопросы")

    # Один запрос к LLM: возвращаем полученные вопросы как есть (в JSON).
    final_questions = questions[:body.num_questions]

    # Создание сессии
    expires = datetime.utcnow() + timedelta(minutes=ASSESSMENT_TIMEOUT_MINUTES)

    session = AssessmentSession(
        user_id=body.user_id,
        specialization=body.specialization,
        expires_at=expires,
        questions=final_questions,
        status="active"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    logger.info(f"✅ Session {session.id} created with {len(final_questions)} questions")

    return GenerateResponse(
        session_id=session.id,
        questions=final_questions,
        expires_at=expires,
        timeout_minutes=ASSESSMENT_TIMEOUT_MINUTES
    )


@app.get("/session/{session_id}", response_model=SessionStatus)
def get_session_status(session_id: int, db: Session = Depends(get_db)):
    """GET /session/{session_id} — проверить статус сессии и оставшееся время"""
    session = db.query(AssessmentSession).filter(AssessmentSession.id == session_id).first()

    if not session:
        raise HTTPException(404, "Сессия не найдена")

    now = datetime.utcnow()
    time_remaining = (session.expires_at - now).total_seconds()

    if time_remaining <= 0:
        session.status = "expired"
        db.commit()

    eval_data = None
    if session.evaluation:
        eval_data = EvalResponse(
            overall_score=session.evaluation.get("overall_score", 0),
            leadership_score=session.evaluation.get("leadership_score", 0),
            reason=session.evaluation.get("reason", ""),
            detailed_feedback=session.evaluation.get("detailed_feedback", ""),
            evaluated_at=session.completed_at or datetime.utcnow()
        )

    return SessionStatus(
        session_id=session.id,
        status=session.status,
        time_remaining_seconds=max(0, int(time_remaining)),
        questions_count=len(session.questions),
        has_answers=session.answers is not None,
        evaluation=eval_data
    )


@app.post("/submit-answers")
def submit_answers(body: SubmitRequest, db: Session = Depends(get_db)):
    """POST /submit-answers — абитуриент отправляет ответы"""
    session = db.query(AssessmentSession).filter(AssessmentSession.id == body.session_id).first()

    if not session:
        raise HTTPException(404, "Сессия не найдена")

    if datetime.utcnow() > session.expires_at:
        session.status = "expired"
        db.commit()
        raise HTTPException(400, "⏰ Время истекло (15 минут)")

    if len(body.answers) != len(session.questions):
        raise HTTPException(400, f"Ожидается {len(session.questions)} ответов, получено {len(body.answers)}")

    session.answers = body.answers
    session.status = "answered"
    session.started_at = datetime.utcnow()
    db.commit()

    logger.info(f"✅ Answers submitted for session {session.id}")

    return {
        "status": "ok",
        "message": "Ответы сохранены. Можно запускать оценку.",
        "session_id": session.id
    }


@app.post("/evaluate", response_model=EvalResponse)
def evaluate(session_id: int, db: Session = Depends(get_db)):
    """POST /evaluate?session_id={id} — LLM оценивает ответы"""
    session = db.query(AssessmentSession).filter(AssessmentSession.id == session_id).first()

    if not session:
        raise HTTPException(404, "Сессия не найдена")

    if not session.answers:
        raise HTTPException(400, "Ответы ещё не отправлены")

    if session.status == "evaluated":
        logger.info(f"Session {session_id} already evaluated, returning cached result")
        return EvalResponse(
            overall_score=session.overall_score or 0,
            leadership_score=session.leadership_score or 0,
            reason=session.evaluation.get("reason", ""),
            detailed_feedback=session.evaluation.get("detailed_feedback", ""),
            evaluated_at=session.completed_at
        )

    # Формирование промпта
    qa_pairs = "\n\n".join([
        f"❓ **Вопрос {i + 1}:** {q}\n\n💬 **Ответ:** {a}"
        for i, (q, a) in enumerate(zip(session.questions, session.answers))
    ])

    eval_prompt = f"""Ты — опытный рекрутер и консультант по {session.specialization}.
Оцени ответы кандидата по следующим критериям:

**Контекст:**
- Специализация: {session.specialization}
- Количество вопросов: {len(session.questions)}
- Время на решение: {ASSESSMENT_TIMEOUT_MINUTES} минут

**Ответы кандидата:**
{qa_pairs}

---

Выдай ТОЛЬКО валидный JSON (без доп. текста):
{{
  "overall_score": число 0-100 (общий уровень: технические знания + качество ответов + структурированность мышления),
  "leadership_score": число 0-100 (лидерский потенциал: способность к принятию решений, управление, стратегическое видение, кризис-менеджмент),
  "reason": "2-3 предложения: общее впечатление и ключевые выводы",
  "detailed_feedback": "подробный разбор: сильные стороны, области для развития, конкретные примеры из ответов, как ответы отражают лидерский потенциал"
}}"""

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": eval_prompt}],
            temperature=0.5,
            max_tokens=1200,
            response_format={"type": "json_object"}
        )

        raw_response = resp.choices[0].message.content
        data = json.loads(raw_response)

        # Валидация результата
        if not all(k in data for k in ["overall_score", "leadership_score", "reason", "detailed_feedback"]):
            raise ValueError("Missing required fields in evaluation")

        overall_score = int(min(100, max(0, data.get("overall_score", 0))))
        leadership_score = int(min(100, max(0, data.get("leadership_score", 0))))

        # Сохранение результата
        session.evaluation = data
        session.overall_score = overall_score
        session.leadership_score = leadership_score
        session.status = "evaluated"
        session.completed_at = datetime.utcnow()
        session.llm_raw_output = raw_response
        db.commit()

        # Сохранение в audit для отладки
        audit = EvaluationAudit(
            session_id=session.id,
            llm_input_prompt=eval_prompt,
            llm_raw_response=raw_response,
            parsed_result=data
        )
        db.add(audit)
        db.commit()

        logger.info(f"✅ Session {session_id} evaluated: overall={overall_score}, leadership={leadership_score}")

        return EvalResponse(
            overall_score=overall_score,
            leadership_score=leadership_score,
            reason=data.get("reason", ""),
            detailed_feedback=data.get("detailed_feedback", ""),
            evaluated_at=session.completed_at
        )

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error in evaluation: {e}")
        raise HTTPException(500, "Ошибка обработки оценки LLM")
    except Exception as e:
        logger.error(f"Evaluation error: {e}")
        session.error_log = str(e)
        db.commit()
        raise HTTPException(500, f"Ошибка оценки: {str(e)}")


@app.get("/health")
def health_check():
    """GET /health — проверка здоровья API"""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "db": "connected"
    }


# ====================== ЗАПУСК ======================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main_improved:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

# uvicorn main_improved:app --reload --port 8000