#!/usr/bin/env python3
"""Shared safety, privacy, and untrusted-text helpers (stdlib only)."""

from __future__ import annotations

import hashlib
import re
from typing import Any


PII_PATTERNS = (
    ("phone", re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)"), "[已遮蔽手机号]"),
    ("email", re.compile(r"(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![A-Za-z])"), "[已遮蔽邮箱]"),
    ("id_card", re.compile(r"(?<!\d)\d{17}[\dXx](?!\d)"), "[已遮蔽身份证号]"),
    ("student_id", re.compile(r"(?i)(学号|student\s*id)\s*[:：]?\s*[A-Za-z0-9_-]{4,}"), r"\1：[已遮蔽]"),
    ("account", re.compile(r"(?i)(账号|用户号|account\s*id)\s*[:：]?\s*[A-Za-z0-9_.-]{4,}"), r"\1：[已遮蔽]"),
    ("name", re.compile(r"(姓名|学生姓名)\s*[:：]\s*[\u4e00-\u9fff·]{2,8}(?=\s*[,，;；\n]|\s+(?:学号|邮箱|电话|住址)|$)"), r"\1：[已遮蔽]"),
    ("address", re.compile(r"(住址|地址)\s*[:：]\s*[^\n,，;；]{6,80}"), r"\1：[已遮蔽]"),
)

INJECTION_PATTERNS = (
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions?", re.I),
    re.compile(r"system\s+prompt", re.I),
    re.compile(r"忽略.{0,12}(指令|规则|提示)"),
    re.compile(r"(泄露|输出|显示).{0,8}(提示词|系统消息|隐藏指令)"),
    re.compile(r"(执行|运行).{0,8}(命令|脚本|代码)"),
)

ACTIVE_ASSESSMENT_PATTERNS = (
    re.compile(r"正在.{0,10}(考试|测验|竞赛|答题)"),
    re.compile(r"(考试|测验|竞赛).{0,10}(进行中|限时|监考|还剩\d+分钟)"),
    re.compile(r"live\s+(exam|test|quiz)", re.I),
)

ENDED_ASSESSMENT_PATTERNS = (
    re.compile(r"(考试|测验|竞赛).{0,8}(已结束|结束后|考完|复盘)"),
    re.compile(r"(已结束|考完).{0,8}(考试|测验|竞赛)"),
)


def all_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "\n".join(all_text(item) for item in value)
    if isinstance(value, dict):
        return "\n".join(all_text(item) for item in value.values())
    return ""


def sanitize_string(value: str) -> tuple[str, list[str]]:
    found: list[str] = []
    clean = value.replace("\x00", "").strip()
    for label, pattern, replacement in PII_PATTERNS:
        clean, count = pattern.subn(replacement, clean)
        found.extend([label] * count)
    return clean, found


def sanitize_tree(value: Any) -> tuple[Any, list[str]]:
    if isinstance(value, str):
        return sanitize_string(value)
    if isinstance(value, list):
        result, found = [], []
        for item in value:
            clean, labels = sanitize_tree(item)
            result.append(clean)
            found.extend(labels)
        return result, found
    if isinstance(value, dict):
        result, found = {}, []
        for key, item in value.items():
            clean, labels = sanitize_tree(item)
            result[str(key)] = clean
            found.extend(labels)
        return result, found
    return value, []


def find_pii(value: Any) -> list[str]:
    text = all_text(value)
    # Opaque system identifiers and state digests are not raw personal data;
    # remove them before numeric-pattern scans to avoid accidental phone hits.
    text = re.sub(r"anonymous-[0-9a-f]{12,64}", "[anonymous-id]", text)
    text = re.sub(r"(?<![0-9A-Za-z])[0-9a-f]{16,64}(?![0-9A-Za-z])", "[opaque-digest]", text)
    return sorted({label for label, pattern, _ in PII_PATTERNS if pattern.search(text)})


def prompt_injection_suspected(value: Any) -> bool:
    text = all_text(value)
    return any(pattern.search(text) for pattern in INJECTION_PATTERNS)


def assessment_is_active(value: Any, explicit: bool = False) -> bool:
    if explicit:
        return True
    text = all_text(value)
    stripped = text
    for pattern in ENDED_ASSESSMENT_PATTERNS:
        stripped = pattern.sub("", stripped)
    return any(pattern.search(stripped) for pattern in ACTIVE_ASSESSMENT_PATTERNS)


ANONYMOUS_IDENTIFIER = re.compile(r"anonymous-[0-9a-f]{12,64}")
IDENTIFIER_KEYS = {"case_id", "learner_id", "summary_id", "案例编号", "题目编号", "学习者编号", "学员编号"}


def anonymize_identifier(value: Any) -> tuple[str, bool]:
    """Pseudonymize every external identifier unless it is already system-shaped."""
    raw = str(value or "unknown").strip()
    if ANONYMOUS_IDENTIFIER.fullmatch(raw):
        return raw, False
    digest = hashlib.sha256(("misconception-loop-id\x00" + raw).encode("utf-8")).hexdigest()[:12]
    return f"anonymous-{digest}", True


def anonymize_tree_identifiers(value: Any) -> tuple[Any, int]:
    if isinstance(value, list):
        items, changed = [], 0
        for item in value:
            clean, count = anonymize_tree_identifiers(item)
            items.append(clean)
            changed += count
        return items, changed
    if isinstance(value, dict):
        result: dict[str, Any] = {}
        changed = 0
        for key, item in value.items():
            text_key = str(key)
            if text_key in IDENTIFIER_KEYS and item is not None:
                clean, was_changed = anonymize_identifier(item)
                result[text_key] = clean
                changed += int(was_changed)
            else:
                clean, count = anonymize_tree_identifiers(item)
                result[text_key] = clean
                changed += count
        return result, changed
    return value, 0
