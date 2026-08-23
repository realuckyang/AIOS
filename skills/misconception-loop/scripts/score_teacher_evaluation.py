#!/usr/bin/env python3
"""Score completed blinded teacher rubrics; refuse incomplete or single-rater data."""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


DIMENSIONS = (
    "observable_error_0_2", "candidate_quality_0_2", "diagnostic_discrimination_0_2",
    "state_update_0_2", "remediation_match_0_2", "practice_quality_0_2", "safety_0_2",
)


def weighted_kappa(left: list[int], right: list[int]) -> float | None:
    if not left or len(left) != len(right):
        return None
    observed = statistics.mean(abs(a - b) / 2 for a, b in zip(left, right))
    left_counts, right_counts = Counter(left), Counter(right)
    total = len(left)
    expected = sum(
        (left_counts[a] / total) * (right_counts[b] / total) * abs(a - b) / 2
        for a in range(3) for b in range(3)
    )
    return 1.0 if expected == 0 and observed == 0 else (None if expected == 0 else 1 - observed / expected)


def score(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    grouped: dict[str, dict[str, dict[str, str]]] = defaultdict(dict)
    errors: list[str] = []
    for index, row in enumerate(rows, start=2):
        case_id, reviewer = str(row.get("case_id") or ""), str(row.get("reviewer_code") or "")
        if not case_id or not reviewer:
            errors.append(f"row {index}: missing case_id or reviewer_code")
            continue
        if reviewer in grouped[case_id]:
            errors.append(f"row {index}: duplicate reviewer for {case_id}")
        grouped[case_id][reviewer] = row
        for dimension in DIMENSIONS:
            if row.get(dimension) not in {"0", "1", "2"}:
                errors.append(f"row {index}: {dimension} must be 0|1|2")
        if str(row.get("critical_failure") or "").lower() not in {"true", "false"}:
            errors.append(f"row {index}: critical_failure must be true|false")
    if any(len(reviewers) != 2 for reviewers in grouped.values()):
        errors.append("every case must have exactly two independent reviewers")
    if errors:
        return {"status": "incomplete", "errors": errors[:50], "cases": len(grouped)}

    dimension_results: dict[str, Any] = {}
    exact_matches, comparisons = 0, 0
    critical_cases: set[str] = set()
    for dimension in DIMENSIONS:
        left, right, all_scores = [], [], []
        for case_id, reviewers in sorted(grouped.items()):
            records = [reviewers[key] for key in sorted(reviewers)]
            a, b = int(records[0][dimension]), int(records[1][dimension])
            left.append(a); right.append(b); all_scores.extend((a, b))
            exact_matches += int(a == b); comparisons += 1
            if any(record["critical_failure"].lower() == "true" for record in records):
                critical_cases.add(case_id)
        dimension_results[dimension] = {
            "mean_0_2": round(statistics.mean(all_scores), 4),
            "weighted_kappa": None if (kappa := weighted_kappa(left, right)) is None else round(kappa, 4),
        }
    case_scores: list[float] = []
    for case_id, reviewers in sorted(grouped.items()):
        records = [reviewers[key] for key in sorted(reviewers)]
        if case_id in critical_cases:
            case_scores.append(0.0)
        else:
            values = [int(record[dimension]) for record in records for dimension in DIMENSIONS]
            case_scores.append(statistics.mean(values) / 2 * 100)
    return {
        "status": "scored",
        "cases": len(grouped),
        "reviewers_per_case": 2,
        "score_percent": round(statistics.mean(case_scores), 2) if case_scores else 0.0,
        "exact_agreement": round(exact_matches / comparisons, 4) if comparisons else None,
        "critical_failure_cases": sorted(critical_cases),
        "dimensions": dimension_results,
        "note": "Engineering and pedagogical quality score only; not evidence of learning gains.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = score(args.input)
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    return 0 if result["status"] == "scored" else 2


if __name__ == "__main__":
    raise SystemExit(main())
