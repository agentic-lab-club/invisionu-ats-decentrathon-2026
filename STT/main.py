import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import urlopen

from groq import Groq
from dotenv import load_dotenv
from presidio_analyzer import AnalyzerEngine
from presidio_analyzer import Pattern
from presidio_analyzer import PatternRecognizer
from presidio_analyzer import RecognizerRegistry
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine

_analyzer_engine: AnalyzerEngine | None = None
_anonymizer_engine: AnonymizerEngine | None = None


def _build_analyzer_engine() -> AnalyzerEngine:
    configuration = {
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
    }

    provider = NlpEngineProvider(nlp_configuration=configuration)
    nlp_engine = provider.create_engine()

    registry = RecognizerRegistry()
    try:
        registry.load_predefined_recognizers(nlp_engine=nlp_engine, supported_languages=["en"])
    except TypeError:
        # Backward compatibility with older presidio-analyzer versions
        # where `supported_languages` argument is not available.
        registry.load_predefined_recognizers(nlp_engine=nlp_engine)

    password_recognizer = PatternRecognizer(
        supported_entity="PASSWORD",
        patterns=[
            Pattern(
                name="password_assignment",
                regex=r"(?i)(?:password|pass|pwd)\s*(?:is|:|=)\s*[^\s,;.]{4,}",
                score=0.95,
            )
        ],
        supported_language="en",
    )

    domain_like_recognizer = PatternRecognizer(
        supported_entity="EMAIL_ADDRESS",
        patterns=[
            Pattern(
                name="domain_like_token",
                regex=r"\b[a-zA-Z0-9._%+-]+(?:@|\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b",
                score=0.8,
            )
        ],
        supported_language="en",
    )

    registry.add_recognizer(password_recognizer)
    registry.add_recognizer(domain_like_recognizer)

    return AnalyzerEngine(
        nlp_engine=nlp_engine,
        registry=registry,
        supported_languages=["en"],
    )

def load_env():
    load_dotenv()

def get_client() -> Groq:
    api_key = os.getenv("GROQ_WHISPER_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_WHISPER_API_KEY не задан в окружении")
    return Groq(api_key=api_key)

def get_presidio_engines() -> tuple[AnalyzerEngine, AnonymizerEngine]:
    global _analyzer_engine, _anonymizer_engine

    if _analyzer_engine is None:
        _analyzer_engine = _build_analyzer_engine()
    if _anonymizer_engine is None:
        _anonymizer_engine = AnonymizerEngine()

    return _analyzer_engine, _anonymizer_engine

def anonymize_personal_data(text: str, language: str = "en") -> str:
    analyzer, anonymizer = get_presidio_engines()
    pii_entities = analyzer.analyze(text=text, language=language)
    anonymized_result = anonymizer.anonymize(text=text, analyzer_results=pii_entities)
    return anonymized_result.text

def download_audio(file_url: str) -> tuple[str, bytes]:
    parsed_url = urlparse(file_url)
    if parsed_url.scheme not in ("http", "https") or not parsed_url.netloc:
        raise ValueError("Некорректный file_url: ожидается абсолютный http/https URL")

    try:
        with urlopen(file_url, timeout=60) as response:
            if getattr(response, "status", 200) >= 400:
                raise RuntimeError(f"Не удалось скачать файл, HTTP статус: {response.status}")
            filename = Path(parsed_url.path).name or "audio.mp3"
            return filename, response.read()
    except HTTPError as error:
        raise RuntimeError(f"Не удалось скачать файл, HTTP статус: {error.code}") from error
    except URLError as error:
        raise RuntimeError(f"Не удалось скачать файл по URL: {error.reason}") from error

def transcribe_audio(file_url: str, model: str = "whisper-large-v3-turbo") -> dict:
    client = get_client()
    try:
        filename, file_bytes = download_audio(file_url)
        print(f"Отправка файла {filename} в Groq API...")
        transcription = client.audio.transcriptions.create(
            file=(filename, file_bytes),
            model=model,
            response_format="json",
            language="en",
            temperature=0.3
        )

        sanitized_text = anonymize_personal_data(transcription.text, language="en")

        print(sanitized_text)
        return {"text": sanitized_text}

    except ValueError:
        raise
    except Exception as e:
        raise RuntimeError(f"Произошла ошибка при транскрипции: {e}")

def main(file_url: str) -> dict:
    load_env()
    return transcribe_audio(file_url)

if __name__ == "__main__":
    load_env()
    audio_file_url = "https://example.com/audio.mp3"
    try:
        result = main(audio_file_url)
        print("Final result:", result)
    except Exception as error:
        print(f"Ошибка: {error}")
