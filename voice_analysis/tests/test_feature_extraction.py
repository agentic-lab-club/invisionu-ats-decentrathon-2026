from __future__ import annotations

import numpy as np

from app.services.feature_extraction import extract_features


def test_extract_features_for_speech_like_signal(settings, speech_like_waveform, sample_rate):
    raw_features, derived_metrics, warnings = extract_features(
        waveform=speech_like_waveform,
        sample_rate=sample_rate,
        settings=settings,
    )

    assert raw_features.duration_seconds > 1.5
    assert raw_features.speech_active_duration_seconds > 0.5
    assert raw_features.pause_ratio > 0.1
    assert raw_features.energy.mean_rms > 0.0
    assert raw_features.pitch.mean_hz is not None
    assert 180.0 < raw_features.pitch.mean_hz < 260.0
    assert raw_features.voice_activity.voiced_frame_ratio is not None
    assert derived_metrics.speech_activity_ratio > 0.3
    assert "Speech-rate proxy is onset-based" in " ".join(warnings)


def test_extract_features_for_silence(settings, silence_waveform, sample_rate):
    raw_features, derived_metrics, warnings = extract_features(
        waveform=silence_waveform,
        sample_rate=sample_rate,
        settings=settings,
    )

    assert raw_features.duration_seconds == 1.0
    assert raw_features.pitch.mean_hz is None
    assert raw_features.silence.silence_ratio == 1.0
    assert raw_features.voice_activity.voiced_frame_count == 0
    assert derived_metrics.speech_activity_ratio == 0.0
    assert any("No stable voiced pitch frames" in warning for warning in warnings)

