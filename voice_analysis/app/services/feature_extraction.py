from __future__ import annotations

from collections.abc import Sequence

import librosa
import numpy as np
from scipy.signal import find_peaks

from app.config import Settings
from app.schemas.analysis import (
    DerivedMetrics,
    EnergyStats,
    PitchStats,
    RawAudioFeatures,
    STTDependentPlaceholders,
    SilenceStats,
    VoiceActivityStats,
)


def _round(value: float | np.floating | None, digits: int = 6) -> float | None:
    if value is None:
        return None
    numeric = float(value)
    if not np.isfinite(numeric):
        return None
    return round(numeric, digits)


def _segments_from_mask(
    mask: np.ndarray,
    sample_rate: int,
    hop_length: int,
    frame_length: int,
    total_duration_seconds: float,
) -> list[tuple[float, float]]:
    if mask.size == 0:
        return []

    segments: list[tuple[float, float]] = []
    start_index: int | None = None

    for index, is_selected in enumerate(mask):
        if is_selected and start_index is None:
            start_index = index
        elif not is_selected and start_index is not None:
            last_index = index - 1
            start_sample = max(0, start_index * hop_length - frame_length // 2)
            end_sample = min(
                int(total_duration_seconds * sample_rate),
                last_index * hop_length + frame_length // 2,
            )
            start_seconds = start_sample / sample_rate
            end_seconds = max(start_seconds, end_sample / sample_rate)
            segments.append((start_seconds, end_seconds))
            start_index = None

    if start_index is not None:
        start_sample = max(0, start_index * hop_length - frame_length // 2)
        start_seconds = start_sample / sample_rate
        segments.append((start_seconds, total_duration_seconds))

    return segments


def _durations(segments: Sequence[tuple[float, float]]) -> list[float]:
    return [end - start for start, end in segments]


def extract_features(
    waveform: np.ndarray,
    sample_rate: int,
    settings: Settings,
) -> tuple[RawAudioFeatures, DerivedMetrics, list[str]]:
    warnings: list[str] = []

    if waveform.size == 0:
        raise ValueError("Waveform is empty after decoding.")

    duration_seconds = float(librosa.get_duration(y=waveform, sr=sample_rate))
    if duration_seconds <= 0:
        raise ValueError("Audio duration is zero.")

    if duration_seconds < 1.0:
        warnings.append(
            "Audio is shorter than 1 second; rate and pause metrics will be unstable."
        )

    frame_length = settings.frame_length
    hop_length = settings.hop_length

    rms = librosa.feature.rms(
        y=waveform,
        frame_length=frame_length,
        hop_length=hop_length,
    ).squeeze()
    if rms.ndim == 0:
        rms = np.asarray([float(rms)])

    onset_envelope = librosa.onset.onset_strength(
        y=waveform,
        sr=sample_rate,
        hop_length=hop_length,
    )
    peak_distance_frames = max(1, int(0.12 * sample_rate / hop_length))
    peak_prominence = max(float(np.std(onset_envelope)) * 0.30, 0.05)
    onset_peaks, _ = find_peaks(
        onset_envelope,
        distance=peak_distance_frames,
        prominence=peak_prominence,
    )

    max_rms = float(np.max(rms)) if rms.size else 0.0
    if max_rms <= 1e-8:
        silent_frames = np.ones(len(rms), dtype=bool)
    else:
        rms_db = librosa.amplitude_to_db(rms, ref=max_rms)
        silent_frames = rms_db <= (-1 * settings.silence_top_db)

    speech_frames = ~silent_frames
    silence_segments = _segments_from_mask(
        mask=silent_frames,
        sample_rate=sample_rate,
        hop_length=hop_length,
        frame_length=frame_length,
        total_duration_seconds=duration_seconds,
    )
    speech_segments = _segments_from_mask(
        mask=speech_frames,
        sample_rate=sample_rate,
        hop_length=hop_length,
        frame_length=frame_length,
        total_duration_seconds=duration_seconds,
    )
    speech_active_duration_seconds = sum(_durations(speech_segments))
    silence_durations = _durations(silence_segments)
    silence_total_duration_seconds = sum(silence_durations)

    pause_durations = [
        duration
        for duration in silence_durations
        if duration >= settings.min_pause_duration_seconds
    ]
    pause_ratio = sum(pause_durations) / duration_seconds

    try:
        f0, voiced_flag, _ = librosa.pyin(
            waveform,
            fmin=settings.pitch_fmin_hz,
            fmax=settings.pitch_fmax_hz,
            sr=sample_rate,
            frame_length=frame_length,
            hop_length=hop_length,
        )
        voiced_mask = np.isfinite(f0)
        voiced_f0 = f0[voiced_mask]
    except Exception as exc:  # pragma: no cover - depends on librosa backend state
        warnings.append(f"Pitch extraction failed: {exc}")
        f0 = np.asarray([], dtype=np.float32)
        voiced_mask = np.asarray([], dtype=bool)
        voiced_flag = np.asarray([], dtype=bool)
        voiced_f0 = np.asarray([], dtype=np.float32)

    if voiced_f0.size == 0:
        warnings.append(
            "No stable voiced pitch frames were detected; pitch statistics are null."
        )

    total_pitch_frames = int(len(f0))
    voiced_frame_count = int(np.sum(voiced_mask)) if voiced_mask.size else 0
    unvoiced_frame_count = max(total_pitch_frames - voiced_frame_count, 0)
    voiced_duration_seconds = voiced_frame_count * hop_length / sample_rate

    raw_audio_features = RawAudioFeatures(
        duration_seconds=_round(duration_seconds) or 0.0,
        analysis_frame_count=int(len(rms)),
        speech_active_duration_seconds=_round(speech_active_duration_seconds) or 0.0,
        onset_peak_count=int(len(onset_peaks)),
        speech_rate_proxy_events_per_second=_round(len(onset_peaks) / duration_seconds)
        or 0.0,
        pause_ratio=_round(pause_ratio) or 0.0,
        pitch=PitchStats(
            mean_hz=_round(np.mean(voiced_f0)) if voiced_f0.size else None,
            median_hz=_round(np.median(voiced_f0)) if voiced_f0.size else None,
            min_hz=_round(np.min(voiced_f0)) if voiced_f0.size else None,
            max_hz=_round(np.max(voiced_f0)) if voiced_f0.size else None,
            std_hz=_round(np.std(voiced_f0)) if voiced_f0.size else None,
            variance_hz=_round(np.var(voiced_f0)) if voiced_f0.size else None,
        ),
        energy=EnergyStats(
            mean_rms=_round(np.mean(rms)) or 0.0,
            std_rms=_round(np.std(rms)) or 0.0,
            variance_rms=_round(np.var(rms)) or 0.0,
            min_rms=_round(np.min(rms)) or 0.0,
            max_rms=_round(np.max(rms)) or 0.0,
            p10_rms=_round(np.percentile(rms, 10)) or 0.0,
            p90_rms=_round(np.percentile(rms, 90)) or 0.0,
        ),
        silence=SilenceStats(
            silence_total_duration_seconds=_round(silence_total_duration_seconds) or 0.0,
            silence_ratio=_round(silence_total_duration_seconds / duration_seconds)
            or 0.0,
            silence_segment_count=int(len(silence_segments)),
            pause_count=int(len(pause_durations)),
            mean_pause_duration_seconds=_round(np.mean(pause_durations))
            if pause_durations
            else None,
            max_pause_duration_seconds=_round(np.max(pause_durations))
            if pause_durations
            else None,
        ),
        voice_activity=VoiceActivityStats(
            voiced_frame_count=voiced_frame_count,
            unvoiced_frame_count=unvoiced_frame_count,
            voiced_frame_ratio=_round(voiced_frame_count / total_pitch_frames)
            if total_pitch_frames
            else None,
            voiced_to_unvoiced_ratio=_round(voiced_frame_count / unvoiced_frame_count)
            if unvoiced_frame_count
            else None,
        ),
        stt_dependent_placeholders=STTDependentPlaceholders(),
    )

    derived_metrics = DerivedMetrics(
        speech_activity_ratio=_round(speech_active_duration_seconds / duration_seconds)
        or 0.0,
        pause_events_per_minute=_round(len(pause_durations) * 60 / duration_seconds)
        or 0.0,
        active_speech_rate_proxy_events_per_second=_round(
            len(onset_peaks) / speech_active_duration_seconds
        )
        if speech_active_duration_seconds > 0
        else None,
        pitch_coefficient_of_variation=_round(
            np.std(voiced_f0) / np.mean(voiced_f0)
        )
        if voiced_f0.size and float(np.mean(voiced_f0)) > 0
        else None,
        energy_coefficient_of_variation=_round(np.std(rms) / np.mean(rms))
        if float(np.mean(rms)) > 0
        else None,
        voiced_to_silence_ratio=_round(voiced_duration_seconds / silence_total_duration_seconds)
        if silence_total_duration_seconds > 0
        else None,
        pause_to_speech_ratio=_round(sum(pause_durations) / speech_active_duration_seconds)
        if speech_active_duration_seconds > 0
        else None,
    )

    warnings.append(
        "Speech-rate proxy is onset-based and should not be interpreted as words-per-minute."
    )
    warnings.append(
        "Filler/disfluency metrics are placeholders until STT or diarized transcript support is added."
    )

    return raw_audio_features, derived_metrics, warnings
