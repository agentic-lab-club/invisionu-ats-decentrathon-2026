from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import get_settings
from app.schemas.analysis import BatchAnalyzeRequest
from app.services.analysis_service import analyze_batch


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Batch analyze local audio files and persist comparison outputs."
    )
    parser.add_argument(
        "--glob",
        dest="glob_pattern",
        default="STT/tests_audio/*.mp3",
        help="Glob pattern relative to repo root or service root.",
    )
    parser.add_argument(
        "--output",
        dest="output_path",
        default="results/batch_analysis.json",
        help="Output JSON path relative to service root unless absolute.",
    )
    parser.add_argument(
        "--file",
        dest="file_paths",
        action="append",
        default=None,
        help="Optional explicit file path. Can be used multiple times.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    settings = get_settings()

    request = BatchAnalyzeRequest(
        file_paths=args.file_paths,
        glob_pattern=args.glob_pattern,
        output_path=args.output_path,
    )
    response = analyze_batch(request, settings)
    print(json.dumps(response.model_dump(mode="json"), indent=2, ensure_ascii=True))
    return 0 if response.metadata.analyzed_count > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

