#!/usr/bin/env python3
"""Calculate a transparent teaching-route state from evidence events."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from safety_utils import anonymize_identifier, sanitize_string


WEIGHTS = {"diagnostic": 1, "isomorphic": 2, "transfer": 3, "exit": 4}
VALID_STATUSES = {
    "insufficient_evidence",
    "needs_support",
    "developing",
    "provisionally_mastered",
}


def update_mastery(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise TypeError("输入必须是 JSON 对象")
    learner_id, learner_id_redacted = anonymize_identifier(payload.get("learner_id"))
    concept, concept_redactions = sanitize_string(str(payload.get("concept") or "未命名知识点"))
    events = payload.get("events")
    if not isinstance(events, list):
        raise ValueError("events 必须是数组")

    accepted: list[dict[str, Any]] = []
    ignored: list[dict[str, Any]] = []
    score = 0
    max_abs_score = 0
    seen_ids: set[str] = set()
    for index, event in enumerate(events[:100]):
        if not isinstance(event, dict):
            ignored.append({"index": index, "reason": "事件不是对象"})
            continue
        event_type = event.get("type")
        correct = event.get("correct")
        if event_type not in WEIGHTS or not isinstance(correct, bool):
            ignored.append({"index": index, "reason": "type 或 correct 无效"})
            continue
        event_id = str(event.get("event_id") or f"{event_type}-{index}")
        if event_id in seen_ids:
            ignored.append({"index": index, "reason": "重复 event_id"})
            continue
        seen_ids.add(event_id)
        weight = WEIGHTS[event_type]
        contribution = weight if correct else -weight
        score += contribution
        max_abs_score += weight
        accepted.append(
            {
                "type": event_type,
                "event_id": event_id,
                "correct": correct,
                "contribution": contribution,
            }
        )
    if len(events) > 100:
        ignored.append({"index": 100, "reason": "单次最多处理100条事件，其余未计分"})

    latest_exit = next((event for event in reversed(accepted) if event["type"] == "exit"), None)
    has_correct_transfer = any(
        event["type"] == "transfer" and event["correct"] for event in accepted
    )

    if len(accepted) < 2:
        status = "insufficient_evidence"
        next_action = "再收集一道诊断题和一道练习的表现"
    elif latest_exit and not latest_exit["correct"]:
        status = "needs_support"
        next_action = "回到已支持的错因，缩小步骤后重新练习"
    elif latest_exit and latest_exit["correct"] and has_correct_transfer and score >= 5:
        status = "provisionally_mastered"
        next_action = "间隔一段时间后用新情境复测"
    elif score >= 2:
        status = "developing"
        next_action = "完成迁移练习与独立退出测试"
    else:
        status = "needs_support"
        next_action = "提供更小步的提示并重新验证概念"

    if status not in VALID_STATUSES:  # Defensive invariant.
        raise RuntimeError("生成了未知状态")

    return {
        "learner_id": learner_id,
        "concept": concept,
        "privacy": {
            "pii_redacted": learner_id_redacted or bool(concept_redactions),
            "raw_identifier_retained": False,
        },
        "routing": {
            "status": status,
            "evidence_score": score,
            "evidence_scale": max_abs_score,
            "accepted_events": len(accepted),
            "next_action": next_action,
            "provisional": True,
            "interpretation": "分数仅用于可复现的教学路由，不是能力概率或心理测量。",
        },
        "evidence": accepted,
        "ignored_events": ignored,
    }


def _read_json(path: str | None) -> Any:
    if path:
        return json.loads(Path(path).read_text(encoding="utf-8-sig"))
    return json.load(sys.stdin)


def main() -> int:
    parser = argparse.ArgumentParser(description="根据学习证据更新教学路由状态")
    parser.add_argument("input", nargs="?", help="输入 JSON；省略时读取 stdin")
    parser.add_argument("-o", "--output", help="输出 JSON 路径")
    args = parser.parse_args()
    try:
        rendered = json.dumps(update_mastery(_read_json(args.input)), ensure_ascii=False, indent=2) + "\n"
        if args.output:
            Path(args.output).write_text(rendered, encoding="utf-8")
        else:
            sys.stdout.write(rendered)
        return 0
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as exc:
        sys.stderr.write(f"update_mastery error: {exc}\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
