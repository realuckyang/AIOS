#!/usr/bin/env python3
"""Validate evidence, safety and phase contracts for misconception-loop output."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

from safety_utils import all_text, assessment_is_active, find_pii
from diagnosis_state import state_token
from verify_math_item import item_digest, verify_item


TAXONOMY = {
    "CONCEPT_MEANING", "RELATION_MODEL", "CONDITION_MISSED", "REPRESENTATION",
    "STRATEGY_CHOICE", "RULE_OPERATION", "CALCULATION", "TRANSCRIPTION",
    "VERIFICATION", "UNCLASSIFIED",
}
CONFIDENCE = {"low", "medium", "high"}
UPDATE_STATUS = {"supported", "weakened", "unresolved"}
PHASES = {"diagnosis", "remediation", "teacher_plan", "teacher_summary", "unsafe_limited"}
LABEL_PATTERN = re.compile(r"(智力低|基础差|你很笨|学习障碍|确诊|就是粗心|能力差)")
ANONYMOUS_ID_PATTERN = re.compile(r"anonymous-[0-9a-f]{12,64}")
DIAGNOSTIC_LEAK_PATTERNS = (
    re.compile(r"(?:正确答案|标准答案|答案\s*(?:是|为|[:：]))"),
    re.compile(r"(?:如果|若|当).{0,24}(?:回答|答|选择).{0,24}(?:支持|削弱|说明|意味着|表明)"),
    re.compile(r"(?:回答|答|选择).{0,24}(?:支持|削弱|说明|意味着|表明).{0,24}(?:候选|错因|理解|掌握)"),
)

COMMON_FIELDS = {"schema_version", "phase", "case_id", "safety"}
PHASE_FIELDS = {
    "diagnosis": COMMON_FIELDS | {"observable_error", "candidates", "diagnostic_item", "diagnosis_state"},
    "teacher_plan": COMMON_FIELDS | {
        "observable_error", "candidates", "diagnostic_item", "diagnosis_state",
        "teacher_card", "learner_worksheet", "conditional_branches",
    },
    "remediation": COMMON_FIELDS | {
        "diagnosis_state", "diagnostic_evidence", "diagnosis_update", "scaffold",
        "micro_lesson", "practice", "routing",
    },
    "teacher_summary": COMMON_FIELDS | {
        "cohort", "total_cases", "metrics", "patterns", "privacy_suppressed", "limitations",
    },
    "unsafe_limited": COMMON_FIELDS | {"reason", "safe_assistance"},
}


def _nonempty(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _diagnostic_question_leaks(question: str) -> bool:
    """Reject student-visible diagnostic prompts that expose answers or judge mappings."""
    if not isinstance(question, str):
        return False
    compact = re.sub(r"\s+", " ", question).strip()
    return any(pattern.search(compact) for pattern in DIAGNOSTIC_LEAK_PATTERNS)


def _dict(data: dict[str, Any], key: str, errors: list[str]) -> dict[str, Any]:
    value = data.get(key)
    if not isinstance(value, dict):
        errors.append(f"{key} 必须是对象")
        return {}
    return value


def _text(data: dict[str, Any], key: str, path: str, errors: list[str]) -> None:
    if not _nonempty(data.get(key)):
        errors.append(f"{path}.{key} 必须是非空字符串")


def _closed(data: dict[str, Any], allowed: set[str], path: str, errors: list[str]) -> None:
    unexpected = set(data) - allowed
    if unexpected:
        errors.append(f"{path} 含未允许字段：" + ", ".join(sorted(unexpected)))


def _validate_safety(data: dict[str, Any], errors: list[str]) -> dict[str, Any]:
    safety = _dict(data, "safety", errors)
    _closed(safety, {"assessment_active", "pii_redacted", "limitations"}, "safety", errors)
    if not isinstance(safety.get("assessment_active"), bool):
        errors.append("safety.assessment_active 必须是布尔值")
    if safety.get("pii_redacted") is not True:
        errors.append("safety.pii_redacted 必须为 true，表示输出已完成隐私扫描")
    if not isinstance(safety.get("limitations"), list):
        errors.append("safety.limitations 必须是数组")
    return safety


def _validate_candidates(data: dict[str, Any], errors: list[str]) -> list[str]:
    candidates = data.get("candidates")
    codes: list[str] = []
    if not isinstance(candidates, list) or not 1 <= len(candidates) <= 3:
        errors.append("candidates 必须包含 1 到 3 个候选")
        return codes
    for index, candidate in enumerate(candidates):
        path = f"candidates[{index}]"
        if not isinstance(candidate, dict):
            errors.append(f"{path} 必须是对象")
            continue
        _closed(candidate, {"code", "claim", "supporting_evidence", "counter_evidence", "confidence", "status"}, path, errors)
        code = candidate.get("code")
        if code not in TAXONOMY:
            errors.append(f"{path}.code 不在分类表中")
        elif code in codes:
            errors.append(f"{path}.code 与前一候选重复")
        else:
            codes.append(code)
        for key in ("claim", "supporting_evidence", "counter_evidence"):
            _text(candidate, key, path, errors)
        if candidate.get("confidence") not in CONFIDENCE:
            errors.append(f"{path}.confidence 无效")
        if candidate.get("status") != "unresolved":
            errors.append(f"{path}.status 第一轮只能是 unresolved")
    return codes


def _validate_state(data: dict[str, Any], codes: list[str], question: str, errors: list[str], expected: str) -> dict[str, Any]:
    state = _dict(data, "diagnosis_state", errors)
    _closed(state, {"schema_version", "case_id", "candidate_codes", "diagnostic_question", "status", "state_token"}, "diagnosis_state", errors)
    if state.get("schema_version") != "2.0":
        errors.append("diagnosis_state.schema_version 必须为 2.0")
    if state.get("case_id") != data.get("case_id"):
        errors.append("diagnosis_state.case_id 必须与顶层 case_id 一致")
    if state.get("status") != expected:
        errors.append(f"diagnosis_state.status 必须为 {expected}")
    if state.get("state_token") not in {state_token(state), "manual-unverified"}:
        errors.append("diagnosis_state.state_token 无效，状态可能未完整承接")
    if expected == "awaiting_response":
        state_codes = state.get("candidate_codes")
        if not isinstance(state_codes, list) or set(state_codes) != set(codes):
            errors.append("diagnosis_state.candidate_codes 必须与候选代码一致")
        if state.get("diagnostic_question") != question:
            errors.append("diagnosis_state.diagnostic_question 必须与诊断微题一致")
    return state


def _validate_first_turn(data: dict[str, Any], errors: list[str], teacher_plan: bool) -> None:
    observable = _dict(data, "observable_error", errors)
    _closed(observable, {"student_evidence", "description", "first_error_step"}, "observable_error", errors)
    for key in ("student_evidence", "description"):
        _text(observable, key, "observable_error", errors)
    codes = _validate_candidates(data, errors)
    item = _dict(data, "diagnostic_item", errors)
    _closed(item, {"question", "distinguishes"}, "diagnostic_item", errors)
    _text(item, "question", "diagnostic_item", errors)
    if _diagnostic_question_leaks(item.get("question", "")):
        errors.append("diagnostic_item.question 疑似泄露正确答案或教师侧候选判读映射；诊断微题必须保持盲测")
    distinguishes = item.get("distinguishes")
    if not isinstance(distinguishes, list) or not distinguishes:
        errors.append("diagnostic_item.distinguishes 必须是非空数组")
    else:
        invalid = [code for code in distinguishes if code not in codes]
        if invalid:
            errors.append("diagnostic_item.distinguishes 只能引用当前候选代码")
    _validate_state(data, codes, item.get("question", ""), errors, "awaiting_response")
    if teacher_plan:
        _text(data, "teacher_card", "$", errors)
        worksheet = data.get("learner_worksheet")
        if not isinstance(worksheet, dict):
            errors.append("learner_worksheet 必须是对象")
        else:
            _closed(worksheet, {"instructions", "question", "response_space", "answer_revealed"}, "learner_worksheet", errors)
            _text(worksheet, "instructions", "learner_worksheet", errors)
            _text(worksheet, "question", "learner_worksheet", errors)
            _text(worksheet, "response_space", "learner_worksheet", errors)
            if worksheet.get("question") != item.get("question"):
                errors.append("learner_worksheet.question 必须与诊断微题一致")
            if worksheet.get("answer_revealed") is not False:
                errors.append("learner_worksheet.answer_revealed 必须为 false")
        branches = data.get("conditional_branches")
        if not isinstance(branches, list) or len(branches) < 2:
            errors.append("conditional_branches 至少包含两个按诊断回答分流的方案")
        else:
            for index, branch in enumerate(branches):
                if not isinstance(branch, dict):
                    errors.append(f"conditional_branches[{index}] 必须是对象")
                    continue
                _closed(branch, {"if_response", "next_action"}, f"conditional_branches[{index}]", errors)
                if not _nonempty(branch.get("if_response")) or not _nonempty(branch.get("next_action")):
                    errors.append("每个 conditional_branches 项都必须含 if_response 和 next_action")
        if re.search(r"(答案|正确结果)\s*[:：]", all_text(data.get("learner_worksheet", {}))):
            errors.append("learner_worksheet 不得泄露诊断题答案")


def _validate_remediation(
    data: dict[str, Any],
    errors: list[str],
    manual_reviews: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    audit: list[dict[str, Any]] = []
    state = _validate_state(data, [], "", errors, "response_received")
    prior_codes = state.get("candidate_codes") if isinstance(state.get("candidate_codes"), list) else []
    _text(data, "diagnostic_evidence", "$", errors)
    updates = data.get("diagnosis_update")
    if not isinstance(updates, list) or not updates:
        errors.append("diagnosis_update 必须是非空数组")
    else:
        for index, update in enumerate(updates):
            path = f"diagnosis_update[{index}]"
            if not isinstance(update, dict):
                errors.append(f"{path} 必须是对象")
                continue
            _closed(update, {"code", "status", "new_evidence"}, path, errors)
            if update.get("code") not in TAXONOMY:
                errors.append(f"{path}.code 不在分类表中")
            if prior_codes and update.get("code") not in prior_codes:
                errors.append(f"{path}.code 不在第一轮候选中")
            if update.get("status") not in UPDATE_STATUS:
                errors.append(f"{path}.status 无效")
            _text(update, "new_evidence", path, errors)
    scaffold = _dict(data, "scaffold", errors)
    _closed(scaffold, {"level_1", "level_2", "level_3"}, "scaffold", errors)
    for level in ("level_1", "level_2", "level_3"):
        _text(scaffold, level, "scaffold", errors)
    _text(data, "micro_lesson", "$", errors)
    practice = _dict(data, "practice", errors)
    _closed(practice, {"isomorphic", "transfer", "exit_ticket"}, "practice", errors)
    for item_name in ("isomorphic", "transfer", "exit_ticket"):
        item = practice.get(item_name)
        if not isinstance(item, dict):
            errors.append(f"practice.{item_name} 必须是对象")
            continue
        item_allowed = {"question", "answer", "verification"}
        if item_name == "exit_ticket":
            item_allowed.add("criterion")
        _closed(item, item_allowed, f"practice.{item_name}", errors)
        _text(item, "question", f"practice.{item_name}", errors)
        _text(item, "answer", f"practice.{item_name}", errors)
        verification = item.get("verification")
        if not isinstance(verification, dict):
            errors.append(f"practice.{item_name}.verification 必须记录答案复核方式")
        else:
            _closed(verification, {"status", "method"}, f"practice.{item_name}.verification", errors)
            if verification.get("status") not in {"verified", "manual_checked"}:
                errors.append(f"practice.{item_name}.verification.status 必须为 verified 或 manual_checked")
            _text(verification, "method", f"practice.{item_name}.verification", errors)
            if _nonempty(item.get("question")) and _nonempty(item.get("answer")):
                actual = verify_item(str(item["question"]), str(item["answer"]))
                digest = item_digest(str(item["question"]), str(item["answer"]))
                record = {
                    "item": item_name,
                    "item_sha256": digest,
                    "claimed_status": verification.get("status"),
                    "actual_status": actual.get("status"),
                    "reason": actual.get("reason"),
                }
                audit.append(record)
                if actual.get("status") == "invalid":
                    errors.append(f"practice.{item_name} 答案独立复算失败：{actual.get('reason')}")
                elif verification.get("status") == "verified" and actual.get("status") != "verified":
                    errors.append(f"practice.{item_name} 自报 verified，但自动复核结果为 {actual.get('status')}")
                elif verification.get("status") == "manual_checked":
                    if actual.get("status") != "unsupported":
                        errors.append(f"practice.{item_name} 仅在自动工具 unsupported 时允许 manual_checked")
                    manual = manual_reviews.get(digest)
                    if not isinstance(manual, dict) or manual.get("status") != "manual_checked" or not _nonempty(manual.get("reviewer_role")):
                        errors.append(f"practice.{item_name} 缺少与题目答案哈希绑定的独立人工复核记录")
    if isinstance(practice.get("exit_ticket"), dict):
        _text(practice["exit_ticket"], "criterion", "practice.exit_ticket", errors)
    routing = _dict(data, "routing", errors)
    _closed(routing, {"concept", "status", "next_action", "provisional"}, "routing", errors)
    for key in ("concept", "status", "next_action"):
        _text(routing, key, "routing", errors)
    if routing.get("provisional") is not True:
        errors.append("routing.provisional 必须为 true")
    return audit


def _validate_summary(data: dict[str, Any], errors: list[str]) -> None:
    _text(data, "cohort", "$", errors)
    total = data.get("total_cases")
    if not isinstance(total, int) or total < 0:
        errors.append("total_cases 必须是非负整数")
    metrics = _dict(data, "metrics", errors)
    _closed(metrics, {"by_code", "by_status", "definitions"}, "metrics", errors)
    if not isinstance(metrics.get("by_code"), dict):
        errors.append("metrics.by_code 必须是对象")
    if not isinstance(metrics.get("by_status"), dict):
        errors.append("metrics.by_status 必须是对象")
    definitions = metrics.get("definitions")
    if not isinstance(definitions, dict):
        errors.append("metrics.definitions 必须是对象")
    else:
        _closed(definitions, {"by_code", "by_status"}, "metrics.definitions", errors)
        _text(definitions, "by_code", "metrics.definitions", errors)
        _text(definitions, "by_status", "metrics.definitions", errors)
    patterns = data.get("patterns")
    if not isinstance(patterns, list):
        errors.append("patterns 必须是数组")
    else:
        for index, pattern in enumerate(patterns):
            if not isinstance(pattern, dict):
                errors.append(f"patterns[{index}] 必须是对象")
                continue
            _closed(pattern, {"code", "count", "interpretation"}, f"patterns[{index}]", errors)
    if not isinstance(data.get("limitations"), list):
        errors.append("limitations 必须是数组")
    suppressed = data.get("privacy_suppressed")
    if not isinstance(suppressed, bool):
        errors.append("privacy_suppressed 必须是布尔值")
    if isinstance(total, int) and total < 5:
        if suppressed is not True:
            errors.append("少于 5 个案例时必须设置 privacy_suppressed=true")
        by_code = metrics.get("by_code") if isinstance(metrics.get("by_code"), dict) else {}
        by_status = metrics.get("by_status") if isinstance(metrics.get("by_status"), dict) else {}
        if by_code:
            errors.append("隐私抑制状态下 metrics.by_code 必须为空对象")
        if by_status:
            errors.append("隐私抑制状态下 metrics.by_status 必须为空对象")
        if isinstance(patterns, list) and patterns:
            errors.append("隐私抑制状态下 patterns 必须为空数组")


def _validate_unsafe(data: dict[str, Any], errors: list[str]) -> None:
    _text(data, "reason", "$", errors)
    assistance = data.get("safe_assistance")
    if not isinstance(assistance, list) or not 1 <= len(assistance) <= 3 or not all(_nonempty(item) for item in assistance):
        errors.append("safe_assistance 必须包含1到3条非空的通用提示或过程检查问题")
    assistance_text = all_text(assistance)
    if re.search(r"(?i)(答案\s*(?:是|为|[:：])|最终(?:答案|结果)|正确结果|\b[A-Za-z]\s*=\s*-?\d+(?:\.\d+)?)", assistance_text):
        errors.append("safe_assistance 疑似夹带直接答案")
    forbidden = ("observable_error", "candidates", "diagnosis_item", "diagnosis_state", "micro_lesson", "practice", "routing", "reference_answer")
    if any(key in data for key in forbidden):
        errors.append("unsafe_limited 不得伪造诊断证据或包含答案/补救包")


def validate_output(
    data: dict[str, Any],
    source_case: dict[str, Any] | None = None,
    manual_reviews: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    verification_audit: list[dict[str, Any]] = []
    manual_reviews = manual_reviews or {}
    if not isinstance(data, dict):
        return {"valid": False, "errors": ["根节点必须是对象"], "warnings": []}
    if data.get("schema_version") != "2.0":
        errors.append("schema_version 必须为 2.0")
    phase = data.get("phase")
    if phase not in PHASES:
        errors.append("phase 必须是 diagnosis、remediation、teacher_plan、teacher_summary 或 unsafe_limited")
    else:
        _closed(data, PHASE_FIELDS[phase], "$", errors)
    _text(data, "case_id", "$", errors)
    safety = _validate_safety(data, errors)

    if phase == "diagnosis":
        _validate_first_turn(data, errors, teacher_plan=False)
    elif phase == "teacher_plan":
        _validate_first_turn(data, errors, teacher_plan=True)
    elif phase == "remediation":
        verification_audit = _validate_remediation(data, errors, manual_reviews)
    elif phase == "teacher_summary":
        _validate_summary(data, errors)
    elif phase == "unsafe_limited":
        _validate_unsafe(data, errors)

    source_active = assessment_is_active(source_case) if source_case else False
    if source_active and safety.get("assessment_active") is not True:
        errors.append("原始输入疑似正在考试，但输出未设置 safety.assessment_active=true")
    if safety.get("assessment_active") is True or source_active:
        if phase != "unsafe_limited":
            errors.append("进行中的考试场景必须使用 unsafe_limited 输出契约")
        if any(key in data for key in ("micro_lesson", "practice", "answer", "reference_answer")):
            errors.append("进行中的考试场景不得输出答案、完整补救包或教师答案包")
        if not safety.get("limitations"):
            errors.append("考试受限场景必须说明 limitations")

    pii_types = find_pii(data)
    if pii_types:
        errors.append("输出含未脱敏个人信息：" + ", ".join(pii_types))
    for identifier_key in ("case_id", "learner_id"):
        identifier = data.get(identifier_key)
        if isinstance(identifier, str) and not ANONYMOUS_ID_PATTERN.fullmatch(identifier):
            errors.append(f"{identifier_key} 必须使用系统生成的 anonymous-哈希 标识")
    if LABEL_PATTERN.search(all_text(data)):
        errors.append("输出含人格化、医学化或终止性标签")

    state = data.get("diagnosis_state")
    if isinstance(state, dict) and state.get("state_token") == "manual-unverified":
        limitations = safety.get("limitations") if isinstance(safety.get("limitations"), list) else []
        if not any("自动" in str(item) and "未运行" in str(item) for item in limitations):
            errors.append("使用 manual-unverified 状态时，safety.limitations 必须说明自动校验未运行")

    if source_case and phase in {"diagnosis", "teacher_plan"}:
        evidence = data.get("observable_error", {}).get("student_evidence", "")
        student_work = str(source_case.get("student_work") or source_case.get("学生作答") or source_case.get("学生答案") or "")
        if _nonempty(evidence) and evidence not in student_work:
            errors.append("observable_error.student_evidence 不是学生作答中的逐字证据")
    elif phase in {"diagnosis", "teacher_plan"}:
        warnings.append("未提供 --case，未执行逐字证据回查")
    if source_case and phase == "remediation":
        source_state = source_case.get("diagnosis_state")
        output_state = data.get("diagnosis_state")
        if not isinstance(source_state, dict):
            errors.append("remediation 的 --case 缺少上一轮 diagnosis_state")
        elif isinstance(output_state, dict):
            for key in ("schema_version", "case_id", "candidate_codes", "diagnostic_question", "state_token"):
                if output_state.get(key) != source_state.get(key):
                    errors.append(f"diagnosis_state.{key} 未原样承接上一轮输入")
        response = str(source_case.get("diagnostic_response") or "")
        evidence = str(data.get("diagnostic_evidence") or "")
        if not response or (evidence not in response and response not in evidence):
            errors.append("diagnostic_evidence 无法回查到 --case 的 diagnostic_response")
    elif phase == "remediation":
        warnings.append("未提供 --case，未执行跨轮状态与诊断回答回查")

    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "verification_audit": verification_audit,
    }


def load_manual_reviews(path: Path | None) -> dict[str, dict[str, Any]]:
    if path is None:
        return {}
    payload = json.loads(path.read_text(encoding="utf-8-sig"))
    records = payload.get("reviews") if isinstance(payload, dict) else payload
    if not isinstance(records, list):
        raise ValueError("人工复核文件必须是数组或包含 reviews 数组")
    result: dict[str, dict[str, Any]] = {}
    for record in records:
        if not isinstance(record, dict):
            raise ValueError("每条人工复核记录必须是对象")
        digest = str(record.get("item_sha256") or "")
        if not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ValueError("人工复核记录缺少有效 item_sha256")
        result[digest] = record
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="校验错因雷达结构化输出")
    parser.add_argument("input", nargs="?", help="输出 JSON；省略时读取 stdin")
    parser.add_argument("--case", help="可选：原始输入 JSON，用于逐字证据回查")
    parser.add_argument("--manual-review", help="独立人工复核记录；仅用于自动工具 unsupported 的题型")
    args = parser.parse_args()
    try:
        data = json.loads(Path(args.input).read_text(encoding="utf-8-sig")) if args.input else json.load(sys.stdin)
        source = json.loads(Path(args.case).read_text(encoding="utf-8-sig")) if args.case else None
        manual_reviews = load_manual_reviews(Path(args.manual_review) if args.manual_review else None)
        report = validate_output(data, source, manual_reviews)
        sys.stdout.write(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        return 0 if report["valid"] else 1
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        sys.stderr.write(f"validate_output error: {exc}\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
