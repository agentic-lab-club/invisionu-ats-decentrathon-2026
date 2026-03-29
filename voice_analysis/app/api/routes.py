from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import Settings, get_settings
from app.schemas.analysis import (
    AudioAnalysisResponse,
    BatchAnalyzeRequest,
    BatchAnalyzeResponse,
    HealthResponse,
    LocalAudioAnalyzeRequest,
)
from app.services.analysis_service import analyze_batch, analyze_local_file, analyze_uploaded_bytes
from app.services.audio_loader import list_test_audio_files

router = APIRouter(prefix="/api/v1", tags=["voice-analysis"])


@router.get("/health", response_model=HealthResponse)
def healthcheck(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(
        service=settings.service_name,
        version=settings.service_version,
        service_root=str(settings.service_root),
        repo_root=str(settings.repo_root),
        test_audio_dir=str(settings.test_audio_dir),
        available_test_audio_files=len(list_test_audio_files(settings)),
    )


@router.post("/analyze/upload", response_model=AudioAnalysisResponse)
async def analyze_uploaded_audio(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> AudioAnalysisResponse:
    try:
        content = await file.read()
        return analyze_uploaded_bytes(
            file_name=file.filename,
            content_type=file.content_type,
            content=content,
            settings=settings,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/analyze/local", response_model=AudioAnalysisResponse)
def analyze_local_audio(
    request: LocalAudioAnalyzeRequest,
    settings: Settings = Depends(get_settings),
) -> AudioAnalysisResponse:
    try:
        return analyze_local_file(request.file_path, settings)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/analyze/batch", response_model=BatchAnalyzeResponse)
def analyze_batch_audio(
    request: BatchAnalyzeRequest,
    settings: Settings = Depends(get_settings),
) -> BatchAnalyzeResponse:
    try:
        return analyze_batch(request, settings)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

