#!/usr/bin/env python3
"""Build and verify a compact carry-forward diagnosis state."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


def state_token(state: dict[str, Any]) -> str:
    core = {
        "schema_version": state.get("schema_version"),
        "case_id": state.get("case_id"),
        "candidate_codes": state.get("candidate_codes"),
        "diagnostic_question": state.get("diagnostic_question"),
    }
    raw = json.dumps(core, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def build(payload: dict[str, Any]) -> dict[str, Any]:
    state = {
        "schema_version": "2.0",
        "case_id": str(payload.get("case_id") or "case-unknown"),
        "candidate_codes": list(payload.get("candidate_codes") or []),
        "diagnostic_question": str(payload.get("diagnostic_question") or ""),
        "status": str(payload.get("status") or "awaiting_response"),
    }
    state["state_token"] = state_token(state)
    return state


def main() -> int:
    parser = argparse.ArgumentParser(description="生成可校验的诊断状态")
    parser.add_argument("input", nargs="?", help="输入 JSON；省略时读取 stdin")
    args = parser.parse_args()
    try:
        payload = json.loads(Path(args.input).read_text(encoding="utf-8-sig")) if args.input else json.load(sys.stdin)
        sys.stdout.write(json.dumps(build(payload), ensure_ascii=False, indent=2) + "\n")
        return 0
    except (OSError, json.JSONDecodeError) as exc:
        sys.stderr.write(f"diagnosis_state error: {exc}\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
