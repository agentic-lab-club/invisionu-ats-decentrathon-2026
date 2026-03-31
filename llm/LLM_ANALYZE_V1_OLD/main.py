import json
import os
import re
from typing import Optional

from groq import Groq
from pydantic import BaseModel, ConfigDict, ValidationError, conint

Score = conint(ge=0, le=5)


class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    subscore: str
    quote: str
    reason: str


class MotivationSubscores(BaseModel):
    model_config = ConfigDict(extra="forbid")
    university_specificity: Score
    program_fit: Score
    goal_alignment: Score
    intrinsic_motivation: Score
    specificity_of_reasoning: Score


class LeadershipPotentialSubscores(BaseModel):
    model_config = ConfigDict(extra="forbid")
    leadership_definition_quality: Score
    concrete_example_presence: Score
    initiative: Score
    responsibility: Score
    impact: Score
    reflection: Score


class ResponseStructureSubscores(BaseModel):
    model_config = ConfigDict(extra="forbid")
    clarity: Score
    coherence: Score
    completeness: Score
    relevance: Score
    conciseness: Score


class Motivation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    subscores: MotivationSubscores
    evidence: list[EvidenceItem]
    weaknesses: list[str]


class LeadershipPotential(BaseModel):
    model_config = ConfigDict(extra="forbid")
    subscores: LeadershipPotentialSubscores
    evidence: list[EvidenceItem]
    weaknesses: list[str]


class ResponseStructure(BaseModel):
    model_config = ConfigDict(extra="forbid")
    subscores: ResponseStructureSubscores
    evidence: list[EvidenceItem]
    weaknesses: list[str]


class ContextNotes(BaseModel):
    model_config = ConfigDict(extra="forbid")
    family_support_context: str
    encouragement_source: str


class TranscriptScoringResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    motivation: Motivation
    leadership_potential: LeadershipPotential
    response_structure: ResponseStructure
    context_notes: ContextNotes
    risk_flags: list[str]
    missing_evidence: list[str]


def extract_json_object(text: str) -> dict:
    content = text.strip()
    if content.startswith("```"):
        content = re.sub(
            r"^```(?:json)?\s*|\s*```$",
            "",
            content,
            flags=re.IGNORECASE | re.DOTALL,
        ).strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, flags=re.DOTALL)
        if not match:
            raise ValueError("Ответ модели не содержит корректный JSON-объект")
        return json.loads(match.group(0))


def read_text_file(path: str) -> str:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Файл не найден: {path}")
    with open(path, "r", encoding="utf-8") as file:
        return file.read()


def load_env_file(path: str = ".env") -> None:
    if not os.path.exists(path):
        return

    with open(path, "r", encoding="utf-8") as file:
        for raw_line in file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def get_temperature(default: float = 0.2) -> float:
    raw_value = os.getenv("TEMPERATURE")
    if raw_value is None or not raw_value.strip():
        return default

    try:
        return float(raw_value)
    except ValueError as error:
        raise ValueError("TEMPERATURE в .env должен быть числом, например 0.2") from error


def get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY не задан в окружении")
    return Groq(api_key=api_key)


def generate_response(
    prompt: str,
    text: str,
    model: Optional[str] = None,
    max_retries: int = 2,
    temperature: float = 0.2,
) -> dict:
    if not prompt.strip():
        raise ValueError("prompt не должен быть пустым")
    if not text.strip():
        raise ValueError("text не должен быть пустым")
    if max_retries < 0:
        raise ValueError("max_retries не может быть отрицательным")

    client = get_client()
    model_name = model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    last_error: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        try:
            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": text},
                ],
                temperature=temperature,
            )

            answer = completion.choices[0].message.content if completion.choices else ""
            payload = extract_json_object(answer or "")
            validated = TranscriptScoringResult.model_validate(payload)

            return {
                "answer": validated.model_dump(),
                "model": model_name,
                "attempt": attempt + 1,
            }
        except (json.JSONDecodeError, ValueError, ValidationError) as error:
            last_error = error
            if attempt == max_retries:
                break
            continue
        except Exception as error:
            raise RuntimeError(f"Ошибка Groq API: {error}") from error

    raise RuntimeError(
        f"Не удалось получить валидный JSON после {max_retries + 1} попыток: {last_error}"
    )


def main(input_data) -> dict:
    load_env_file()

    prompt_text = read_text_file("prompt.txt")
    #input_text = read_text_file("input.txt")
    temperature = get_temperature()

    result = generate_response(
        prompt=prompt_text,
        text=input_data,
        model=None,
        max_retries=3,
        temperature=temperature,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))

    return result



if __name__ == "__main__":
    main()
