#!/usr/bin/env python3
"""Create privacy-thresholded class summaries from anonymous validated cases."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

from safety_utils import ANONYMOUS_IDENTIFIER, anonymize_identifier, find_pii
from validate_output import validate_output


MIN_GROUP_SIZE = 5


def summarize(payload: dict[str, Any]) -> dict[str, Any]:
    cases = payload.get("cases")
    if not isinstance(cases, list):
        raise ValueError("cases 必须是数组")
    if find_pii(cases):
        raise ValueError("批量输入仍含可识别个人信息，请先脱敏")

    # Privacy-first gate: when the provided cohort is already below the
    # publication threshold, do not inspect or expose diagnosis distributions.
    # We still require system-anonymous identifiers so raw classroom IDs cannot
    # be smuggled into an aggregate response.
    for case in cases:
        if not isinstance(case, dict):
            raise ValueError("cases 中每项都必须是对象")
        case_id = case.get("case_id")
        if not isinstance(case_id, str) or not ANONYMOUS_IDENTIFIER.fullmatch(case_id):
            raise ValueError("每个案例必须使用系统生成的 anonymous-哈希 标识")

    if len(cases) < MIN_GROUP_SIZE:
        # Validate structure but deliberately do not derive diagnosis counts or
        # patterns. This keeps the threshold meaningful while rejecting forged
        # or malformed case objects.
        for case in cases:
            validation = validate_output(case)
            if not validation["valid"]:
                raise ValueError("案例未通过输出校验：" + "；".join(validation["errors"][:5]))
        return {
            "schema_version": "2.0",
            "phase": "teacher_summary",
            "case_id": anonymize_identifier(payload.get("summary_id") or "class-summary")[0],
            "cohort": str(payload.get("cohort") or "未命名班级"),
            "total_cases": len(cases),
            "metrics": {
                "by_code": {},
                "by_status": {},
                "definitions": {
                    "by_code": "出现该代码的案例数；同一案例同一代码最多计1次",
                    "by_status": "候选状态记录数；一个案例可贡献多条",
                },
            },
            "patterns": [],
            "privacy_suppressed": True,
            "limitations": [f"提供案例少于 {MIN_GROUP_SIZE}，已在解析分类前隐藏全部分组统计"],
            "safety": {"assessment_active": False, "pii_redacted": True, "limitations": []},
        }

    code_counts: Counter[str] = Counter()
    status_counts: Counter[str] = Counter()
    usable = 0
    for case in cases:
        validation = validate_output(case)
        if not validation["valid"]:
            raise ValueError("案例未通过输出校验：" + "；".join(validation["errors"][:5]))
        updates = case.get("diagnosis_update") or case.get("candidates") or []
        if not isinstance(updates, list):
            continue
        used = False
        case_codes: set[str] = set()
        for item in updates:
            if isinstance(item, dict) and isinstance(item.get("code"), str):
                case_codes.add(item["code"])
                if isinstance(item.get("status"), str):
                    status_counts[item["status"]] += 1
                used = True
        code_counts.update(case_codes)
        usable += int(used)

    suppressed = usable < MIN_GROUP_SIZE
    return {
        "schema_version": "2.0",
        "phase": "teacher_summary",
        "case_id": anonymize_identifier(payload.get("summary_id") or "class-summary")[0],
        "cohort": str(payload.get("cohort") or "未命名班级"),
        "total_cases": usable,
        "metrics": {
            "by_code": {} if suppressed else dict(code_counts.most_common()),
            "by_status": {} if suppressed else dict(status_counts.most_common()),
            "definitions": {
                "by_code": "出现该代码的案例数；同一案例同一代码最多计1次",
                "by_status": "候选状态记录数；一个案例可贡献多条",
            },
        },
        "patterns": [] if suppressed else [
            {"code": code, "count": count, "interpretation": "待教师结合课堂证据复核"}
            for code, count in code_counts.most_common(5)
        ],
        "privacy_suppressed": suppressed,
        "limitations": ([f"有效案例少于 {MIN_GROUP_SIZE}，已隐藏分组统计"] if suppressed else ["仅汇总已提供且可用的诊断记录，不代表长期能力"]),
        "safety": {"assessment_active": False, "pii_redacted": True, "limitations": []},
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="生成隐私阈值保护的班级错因汇总")
    parser.add_argument("input", nargs="?", help="批量输入 JSON；省略时读取 stdin")
    args = parser.parse_args()
    try:
        payload = json.loads(Path(args.input).read_text(encoding="utf-8-sig")) if args.input else json.load(sys.stdin)
        sys.stdout.write(json.dumps(summarize(payload), ensure_ascii=False, indent=2) + "\n")
        return 0
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        sys.stderr.write(f"summarize_class error: {exc}\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
