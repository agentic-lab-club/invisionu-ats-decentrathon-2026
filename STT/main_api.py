from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import main as stt_module

app = FastAPI()

class TranscribeRequest(BaseModel):
    filepath: str

@app.post("/transcribe")
async def transcribe_audio(request: TranscribeRequest):
    try:
        result = stt_module.main(request.filepath)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
