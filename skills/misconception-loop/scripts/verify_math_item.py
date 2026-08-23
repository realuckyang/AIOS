#!/usr/bin/env python3
"""Verify supported one-variable linear equations with exact rational arithmetic."""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import re
import sys
from fractions import Fraction
from pathlib import Path
from typing import Any


def _linear(node: ast.AST, variable: str) -> tuple[Fraction, Fraction]:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return Fraction(0), Fraction(str(node.value))
    if isinstance(node, ast.Name) and node.id == variable:
        return Fraction(1), Fraction(0)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        a, b = _linear(node.operand, variable)
        return (a, b) if isinstance(node.op, ast.UAdd) else (-a, -b)
    if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub)):
        a1, b1 = _linear(node.left, variable)
        a2, b2 = _linear(node.right, variable)
        return (a1 + a2, b1 + b2) if isinstance(node.op, ast.Add) else (a1 - a2, b1 - b2)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Mult):
        a1, b1 = _linear(node.left, variable)
        a2, b2 = _linear(node.right, variable)
        if a1 and a2:
            raise ValueError("非线性乘积")
        return (a1 * b2 + a2 * b1, b1 * b2)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Div):
        a1, b1 = _linear(node.left, variable)
        a2, b2 = _linear(node.right, variable)
        if a2 or b2 == 0:
            raise ValueError("分母含变量或为零")
        return a1 / b2, b1 / b2
    raise ValueError("不支持的表达式")


def _parse_expr(text: str, variable: str) -> tuple[Fraction, Fraction]:
    normalized = text.strip().rstrip("。；;，,").replace("×", "*").replace("÷", "/").replace("−", "-").replace("^", "**")
    normalized = re.sub(rf"(?<=\d)\s*{re.escape(variable)}", f"*{variable}", normalized)
    normalized = re.sub(r"(?<=\d)\s*(?=\()", "*", normalized)
    tree = ast.parse(normalized.strip(), mode="eval")
    return _linear(tree.body, variable)


NUMERIC_PATTERN = r"[+-]?(?:\d+\s*/\s*[+-]?\d+|\d+(?:\.\d+)?)"


def item_digest(question: str, answer: str) -> str:
    canonical = json.dumps(
        {"question": " ".join(question.split()), "answer": " ".join(answer.split())},
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _fraction(value: str) -> Fraction:
    return Fraction(re.sub(r"\s+", "", value).replace("−", "-"))


def _parse_answer(answer: str, variable: str) -> dict[str, Any]:
    normalized = answer.replace("−", "-").strip()
    explicit = re.findall(
        rf"(?<![A-Za-z0-9_]){re.escape(variable)}\s*=\s*({NUMERIC_PATTERN})",
        normalized,
    )
    if explicit:
        try:
            values = [_fraction(value) for value in explicit]
        except (ValueError, ZeroDivisionError) as exc:
            return {"status": "invalid", "reason": f"明确答案数值无效：{exc}", "parse_rule": "explicit_variable_assignment"}
        unique = list(dict.fromkeys(values))
        if len(unique) > 1:
            return {
                "status": "invalid",
                "reason": "回答中存在互相冲突的明确答案",
                "parse_rule": "explicit_variable_assignment",
                "provided_candidates": [str(value) for value in values],
            }
        return {
            "status": "parsed",
            "value": unique[0],
            "parse_rule": "explicit_variable_assignment",
            "provided_candidates": [str(value) for value in values],
        }
    standalone = re.fullmatch(rf"\s*({NUMERIC_PATTERN})\s*[。；;，,]?\s*", normalized)
    if standalone:
        try:
            value = _fraction(standalone.group(1))
        except (ValueError, ZeroDivisionError) as exc:
            return {"status": "invalid", "reason": f"答案数值无效：{exc}", "parse_rule": "standalone_numeric"}
        return {
            "status": "parsed",
            "value": value,
            "parse_rule": "standalone_numeric",
            "provided_candidates": [str(value)],
        }
    return {
        "status": "unsupported",
        "reason": f"未找到明确的 {variable}=数值；含说明文字时不猜测其中数字",
        "parse_rule": "no_unambiguous_final_answer",
    }


def verify_item(question: str, answer: str) -> dict[str, Any]:
    try:
        normalized_question = question.replace("×", "*").replace("÷", "/").replace("−", "-")
        equation_matches = re.findall(r"[0-9A-Za-z+*/().\-\s]+=[0-9A-Za-z+*/().\-\s]+", normalized_question)
        equation = equation_matches[-1].strip().rstrip("。；;，,") if equation_matches else ""
        if equation.count("=") != 1:
            return {"status": "unsupported", "reason": "目前只自动复核单个等式"}
        variables = sorted(set(re.findall(r"[A-Za-z]", equation)))
        if len(variables) != 1:
            return {"status": "unsupported", "reason": "目前只复核单一字母未知数"}
        variable = variables[0]
        left, right = equation.split("=", 1)
        a1, b1 = _parse_expr(left, variable)
        a2, b2 = _parse_expr(right, variable)
        coefficient = a1 - a2
        constant = b2 - b1
        if coefficient == 0:
            return {"status": "invalid", "reason": "方程无唯一解"}
        expected = constant / coefficient
        parsed = _parse_answer(answer, variable)
        if parsed["status"] != "parsed":
            return {
                **parsed,
                "expected": str(expected),
                "item_sha256": item_digest(question, answer),
            }
        actual = parsed["value"]
        return {
            "status": "verified" if actual == expected else "invalid",
            "expected": str(expected),
            "provided": str(actual),
            "provided_candidates": parsed["provided_candidates"],
            "parse_rule": parsed["parse_rule"],
            "item_sha256": item_digest(question, answer),
            "reason": "答案与精确计算一致" if actual == expected else "答案与精确计算不一致",
        }
    except (SyntaxError, ValueError, ZeroDivisionError) as exc:
        return {"status": "unsupported", "reason": str(exc)}


def main() -> int:
    parser = argparse.ArgumentParser(description="复核一元一次方程练习题答案")
    parser.add_argument("input", nargs="?", help="含 question 和 answer 的 JSON")
    args = parser.parse_args()
    try:
        payload = json.loads(Path(args.input).read_text(encoding="utf-8-sig")) if args.input else json.load(sys.stdin)
        report = verify_item(str(payload.get("question", "")), str(payload.get("answer", "")))
        sys.stdout.write(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        return 0 if report["status"] == "verified" else 1
    except (OSError, json.JSONDecodeError) as exc:
        sys.stderr.write(f"verify_math_item error: {exc}\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
