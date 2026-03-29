from __future__ import annotations

import pytest

from app.config import get_settings
from app.services.analysis_service import analyze_local_file
from app.services.audio_loader import list_test_audio_files


@pytest.mark.smoke
def test_real_test_audio_files_can_be_analyzed():
    settings = get_settings()
    audio_files = list_test_audio_files(settings)

    if not audio_files:
        pytest.skip("No audio files found in configured TEST_AUDIO_DIR.")

    for audio_file in audio_files:
        result = analyze_local_file(str(audio_file), settings)
        assert result.raw_audio_features.duration_seconds > 0
        assert result.metadata.file_name == audio_file.name
        assert result.raw_audio_features.energy.mean_rms >= 0

