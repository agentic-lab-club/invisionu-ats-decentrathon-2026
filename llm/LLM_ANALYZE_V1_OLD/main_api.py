from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import llm.LLM_ANALYZE_V1_OLD.main as scoring

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

