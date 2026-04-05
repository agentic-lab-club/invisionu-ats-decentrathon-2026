import asyncio
import unittest
from unittest.mock import patch

from fastapi import HTTPException

import main_api


class TranscribeAPITests(unittest.TestCase):
    def test_transcribe_accepts_file_url(self):
        request = main_api.TranscribeRequest(file_url="https://signed.example/audio.mp3")

        with patch("main_api.stt_module.main", return_value={"text": "hello"}) as mocked_main:
            result = asyncio.run(main_api.transcribe_audio(request))

        mocked_main.assert_called_once_with("https://signed.example/audio.mp3")
        self.assertEqual(result, {"text": "hello"})

    def test_transcribe_returns_400_for_invalid_url(self):
        request = main_api.TranscribeRequest(file_url="not-a-url")

        with patch("main_api.stt_module.main", side_effect=ValueError("Некорректный file_url")):
            with self.assertRaises(HTTPException) as context:
                asyncio.run(main_api.transcribe_audio(request))

        self.assertEqual(context.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
