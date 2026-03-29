from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import main as scoring

app = FastAPI()

class AnalyzeRequest(BaseModel):
    input_data: str

@app.post("/analyze")
async def get_analys(request: AnalyzeRequest):
    try:
        result = scoring.main(request.input_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

