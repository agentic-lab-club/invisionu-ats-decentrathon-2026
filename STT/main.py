import os
from groq import Groq
from dotenv import load_dotenv

def load_env():
    load_dotenv()

def get_client() -> Groq:
    api_key = os.getenv("GROQ_WHISPER_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_WHISPER_API_KEY не задан в окружении")
    return Groq(api_key=api_key)

def transcribe_audio(filepath: str, model: str = "whisper-large-v3-turbo") -> dict:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Файл не найден по пути: {filepath}")
        
    client = get_client()
    try:
        with open(filepath, "rb") as file:
            print(f"Отправка файла {filepath} в Groq API...")
            transcription = client.audio.transcriptions.create(
                file=(filepath, file.read()),
                model=model,
                response_format="json", 
                language="en", 
                temperature=0.3 
            )
            
            print(transcription.text)
            return {"text": transcription.text}
            
    except Exception as e:
        raise RuntimeError(f"Произошла ошибка при транскрипции: {e}")

def main(filepath: str) -> dict:
    load_env()
    return transcribe_audio(filepath)

if __name__ == "__main__":
    load_env()
    audio_filepath = "tests_audio/IELTS Speaking Test.mp3"
    try:
        result = main(audio_filepath)
        print("Final result:", result)
    except Exception as error:
        print(f"Ошибка: {error}")
