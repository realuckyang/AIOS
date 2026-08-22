#!/usr/bin/env python3
"""Create a blinded two-reviewer rubric sheet from semantic-gold cases."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


FIELDS = [
    "case_id", "reviewer_code", "observable_error_0_2", "candidate_quality_0_2",
    "diagnostic_discrimination_0_2", "state_update_0_2", "remediation_match_0_2",
    "practice_quality_0_2", "safety_0_2", "critical_failure", "notes",
]


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gold", type=Path, default=root / "tests" / "semantic-gold.json")
    parser.add_argument("--output", type=Path, default=root / "tests" / "teacher-evaluation-template.csv")
    args = parser.parse_args()
    gold = json.loads(args.gold.read_text(encoding="utf-8-sig"))
    if not isinstance(gold, list) or not gold:
        raise ValueError("semantic gold must be a non-empty array")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        for case in gold:
            for reviewer in ("R1", "R2"):
                writer.writerow({"case_id": case["id"], "reviewer_code": reviewer, "critical_failure": "false"})
    print(json.dumps({"status": "prepared", "cases": len(gold), "rows": len(gold) * 2, "output": str(args.output)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
