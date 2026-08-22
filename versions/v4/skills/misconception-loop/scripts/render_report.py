#!/usr/bin/env python3
"""Render validated structured output as safe plain Markdown."""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path
from typing import Any

from validate_output import load_manual_reviews, validate_output


def _safe(value: Any) -> str:
    text = html.escape(str(value), quote=True)
    return re.sub(r"([\\`*_\[\]|])", r"\\\1", " ".join(text.split()))


def _safe_code(value: Any) -> str:
    return html.escape(str(value), quote=True).replace("`", "\\`")


def render(
    data: dict[str, Any],
    audience: str = "teacher",
    source_case: dict[str, Any] | None = None,
    manual_reviews: dict[str, dict[str, Any]] | None = None,
) -> str:
    if audience not in {"teacher", "learner"}:
        raise ValueError("audience 必须是 teacher 或 learner")
    report = validate_output(data, source_case, manual_reviews)
    if not report["valid"]:
        raise ValueError("输出未通过校验：" + "；".join(report["errors"]))
    phase = data["phase"]
    lines = [f"# 错因雷达 · {_safe(data['case_id'])}", ""]
    if phase in {"diagnosis", "teacher_plan"}:
        if audience == "teacher":
            lines += ["## 可观察错误", "", _safe(data["observable_error"]["description"]), "", "## 候选错因", ""]
            for item in data["candidates"]:
                lines.append(f"- `{_safe_code(item['code'])}`：{_safe(item['claim'])}（{_safe(item['confidence'])}）")
            lines += ["", "## 诊断微题", "", _safe(data["diagnostic_item"]["question"])]
        elif phase == "diagnosis":
            lines += ["## 请完成这道诊断微题", "", _safe(data["diagnostic_item"]["question"]), "", "请写出答案并用一句话说明理由。"]
        if phase == "teacher_plan" and audience == "teacher":
            worksheet = data["learner_worksheet"]
            lines += ["", "## 教师卡", "", _safe(data["teacher_card"]), "", "## 学生练习单", "", _safe(worksheet["instructions"]), "", _safe(worksheet["question"]), "", _safe(worksheet["response_space"])]
            lines += ["", "## 条件式分流", ""]
            for branch in data["conditional_branches"]:
                lines.append(f"- 若：{_safe(branch['if_response'])}；则：{_safe(branch['next_action'])}")
        elif phase == "teacher_plan":
            worksheet = data["learner_worksheet"]
            lines += ["## 学生诊断练习单", "", _safe(worksheet["instructions"]), "", _safe(worksheet["question"]), "", _safe(worksheet["response_space"])]
    elif phase == "remediation":
        if audience == "teacher":
            lines += ["## 诊断结果", ""]
            for item in data["diagnosis_update"]:
                lines.append(f"- `{_safe_code(item['code'])}` → {_safe(item['status'])}：{_safe(item['new_evidence'])}")
        lines += ["", "## 分层提示", ""]
        for key in ("level_1", "level_2", "level_3"):
            lines.append(f"- {_safe(data['scaffold'][key])}")
        lines += ["", "## 微讲解", "", _safe(data["micro_lesson"]), "", "## 练习与退出测试", ""]
        for key in ("isomorphic", "transfer", "exit_ticket"):
            item = data["practice"][key]
            if audience == "teacher":
                lines.append(f"- {_safe(item['question'])} 〔教师答案：{_safe(item['answer'])}〕")
            else:
                lines.append(f"- {_safe(item['question'])}")
    elif phase == "teacher_summary":
        if audience != "teacher":
            raise ValueError("teacher_summary 只允许生成 teacher 受众报告")
        lines += ["## 班级汇总", "", f"有效案例：{data['total_cases']}", ""]
        for code, count in data["metrics"]["by_code"].items():
            lines.append(f"- `{_safe_code(code)}`：{count}")
    else:
        lines += ["## 安全受限说明", "", _safe(data["reason"]), ""]
        for item in data["safe_assistance"]:
            lines.append(f"- {_safe(item)}")
    lines += ["", "---", "结论仅基于当前证据，教学路由状态均为暂定。", ""]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="把已校验 JSON 渲染为安全 Markdown")
    parser.add_argument("input")
    parser.add_argument("-o", "--output")
    parser.add_argument("--audience", choices=("teacher", "learner"), default="teacher")
    parser.add_argument("--case", help="原始或规范化案例，用于证据回查")
    parser.add_argument("--manual-review", help="独立人工复核记录")
    args = parser.parse_args()
    try:
        data = json.loads(Path(args.input).read_text(encoding="utf-8-sig"))
        source = json.loads(Path(args.case).read_text(encoding="utf-8-sig")) if args.case else None
        manual_reviews = load_manual_reviews(Path(args.manual_review) if args.manual_review else None)
        output = render(data, args.audience, source, manual_reviews)
        if args.output:
            Path(args.output).write_text(output, encoding="utf-8")
        else:
            sys.stdout.write(output)
        return 0
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        sys.stderr.write(f"render_report error: {exc}\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
