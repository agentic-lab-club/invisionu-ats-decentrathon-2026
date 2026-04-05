from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import main as stt_module

app = FastAPI()

class TranscribeRequest(BaseModel):
    file_url: str

@app.post("/transcribe")
async def transcribe_audio(request: TranscribeRequest):
    try:
        result = stt_module.main(request.file_url)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
