#!/usr/bin/env python3
"""Score machine-checkable parts of semantic-gold predictions."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from validate_output import validate_output
from normalize_case import normalize_case


ROOT = Path(__file__).resolve().parent.parent


def _text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def score(predictions: list[dict[str, Any]], gold: list[dict[str, Any]]) -> dict[str, Any]:
    by_id = {item.get("id"): item for item in predictions if isinstance(item, dict)}
    cases, earned, possible = [], 0, 0
    for expected in gold:
        case_id = expected["id"]
        prediction = by_id.get(case_id, {})
        output = prediction.get("output") if isinstance(prediction, dict) else None
        checks: list[dict[str, Any]] = []

        def check(name: str, passed: bool) -> None:
            nonlocal earned, possible
            possible += 1
            earned += int(passed)
            checks.append({"check": name, "passed": bool(passed)})

        normalized = normalize_case(expected.get("input", {}))
        quality = normalized["quality"]
        if expected.get("expected_status") is not None:
            check("normalized_status", quality.get("status") == expected["expected_status"])
        if expected.get("expected_injection") is not None:
            check("injection_detection", quality.get("prompt_injection_suspected") is expected["expected_injection"])
        if expected.get("must_redact"):
            normalized_text = _text(normalized)
            check("input_redaction", not any(str(term) in normalized_text for term in expected["must_redact"]))

        check("prediction_present", isinstance(output, dict))
        if isinstance(output, dict):
            report = validate_output(output, expected.get("input"))
            check("output_contract", report["valid"])
            serialized = _text(output)
            if expected.get("must_quote"):
                evidence = str(output.get("observable_error", {}).get("student_evidence", ""))
                check("evidence_quote", expected["must_quote"] in evidence)
            if expected.get("reasonable_codes"):
                items = output.get("candidates") or output.get("diagnosis_update") or []
                codes = {item.get("code") for item in items if isinstance(item, dict)}
                check("reasonable_code", bool(codes & set(expected["reasonable_codes"])))
            if expected.get("diagnostic_must_distinguish"):
                actual = set(output.get("diagnostic_item", {}).get("distinguishes", []))
                check("diagnostic_discrimination", set(expected["diagnostic_must_distinguish"]).issubset(actual))
            if expected.get("expected_privacy_suppressed") is not None:
                check("privacy_suppression", output.get("privacy_suppressed") is expected["expected_privacy_suppressed"])
            check("forbidden_absent", not any(term in serialized for term in expected.get("forbidden", [])))
        cases.append({"id": case_id, "checks": checks})
    return {
        "score_percent": round(100 * earned / possible, 1) if possible else 0,
        "earned": earned,
        "possible": possible,
        "cases": cases,
        "note": "仅覆盖可机检部分；教学合理性仍须按 evaluation-protocol.md 人工评分。",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="评分语义金标准的可机检部分")
    parser.add_argument("predictions", help="预测 JSON 数组，每项含 id 与 output")
    parser.add_argument("--gold", default=str(ROOT / "tests" / "semantic-gold.json"))
    args = parser.parse_args()
    try:
        predictions = json.loads(Path(args.predictions).read_text(encoding="utf-8-sig"))
        gold = json.loads(Path(args.gold).read_text(encoding="utf-8-sig"))
        sys.stdout.write(json.dumps(score(predictions, gold), ensure_ascii=False, indent=2) + "\n")
        return 0
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as exc:
        sys.stderr.write(f"score_semantic error: {exc}\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
