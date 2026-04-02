import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import urlopen

from groq import Groq
from dotenv import load_dotenv

def load_env():
    load_dotenv()

def get_client() -> Groq:
    api_key = os.getenv("GROQ_WHISPER_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_WHISPER_API_KEY не задан в окружении")
    return Groq(api_key=api_key)

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

        print(transcription.text)
        return {"text": transcription.text}

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
