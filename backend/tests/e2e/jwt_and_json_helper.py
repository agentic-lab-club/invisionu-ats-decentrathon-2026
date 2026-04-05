#!/usr/bin/env python3

import argparse
import base64
import hashlib
import hmac
import json
import sys
import time
from pathlib import Path


def _load_json(path: str):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _resolve_path(data, path: str):
    cursor = data
    for chunk in path.split("."):
        if not chunk:
            continue

        while "[" in chunk:
            prefix, rest = chunk.split("[", 1)
            if prefix:
                cursor = cursor[prefix]
            index_str, suffix = rest.split("]", 1)
            cursor = cursor[int(index_str)]
            chunk = suffix

        if chunk:
            cursor = cursor[chunk]
    return cursor


def cmd_jwt(args):
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "user_id": args.user_id,
        "role": "user",
        "type": "access",
        "sub": args.user_id,
        "iat": now,
        "exp": now + int(args.ttl_seconds),
    }

    encoded_header = _b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
    signature = hmac.new(args.secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    print(f"{encoded_header}.{encoded_payload}.{_b64url(signature)}")


def cmd_json_get(args):
    data = _load_json(args.path)
    value = _resolve_path(data, args.json_path)
    if isinstance(value, (dict, list)):
        print(json.dumps(value, separators=(",", ":")))
    elif value is None:
        print("null")
    else:
        print(value)


def cmd_json_require_keys(args):
    data = _load_json(args.path)
    missing = [key for key in args.keys if key not in data]
    if missing:
        print(f"missing keys: {', '.join(missing)}", file=sys.stderr)
        raise SystemExit(1)


def cmd_build_personality_answers(args):
    data = _load_json(args.path)
    questions = data.get("questions", [])
    if not questions:
        print("personality test response does not contain questions", file=sys.stderr)
        raise SystemExit(1)

    answers = []
    for question in questions:
        options = question.get("options", [])
        if not question.get("id") or not options or not options[0].get("id"):
            print("personality test question is missing id or first option id", file=sys.stderr)
            raise SystemExit(1)
        answers.append(
            {
                "question_id": question["id"],
                "option_id": options[0]["id"],
            }
        )

    print(json.dumps(answers, separators=(",", ":")))


def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    jwt_parser = subparsers.add_parser("jwt")
    jwt_parser.add_argument("secret")
    jwt_parser.add_argument("user_id")
    jwt_parser.add_argument("ttl_seconds")
    jwt_parser.set_defaults(func=cmd_jwt)

    json_get_parser = subparsers.add_parser("json-get")
    json_get_parser.add_argument("path")
    json_get_parser.add_argument("json_path")
    json_get_parser.set_defaults(func=cmd_json_get)

    require_keys_parser = subparsers.add_parser("json-require-keys")
    require_keys_parser.add_argument("path")
    require_keys_parser.add_argument("keys", nargs="+")
    require_keys_parser.set_defaults(func=cmd_json_require_keys)

    build_answers_parser = subparsers.add_parser("build-personality-answers")
    build_answers_parser.add_argument("path")
    build_answers_parser.set_defaults(func=cmd_build_personality_answers)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
