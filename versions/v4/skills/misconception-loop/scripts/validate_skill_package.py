#!/usr/bin/env python3
"""Audit a Skill source directory or final ZIP with stdlib only."""

from __future__ import annotations

import json
import ast
import posixpath
import re
import sys
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any


ALLOWED_EXTENSIONS = {
    ".md", ".txt", ".json", ".yaml", ".yml", ".js", ".cjs", ".mjs",
    ".ts", ".py", ".sh", ".csv", ".png", ".jpg", ".jpeg", ".svg",
}
TEXT_EXTENSIONS = {".md", ".txt", ".json", ".yaml", ".yml", ".js", ".cjs", ".mjs", ".ts", ".py", ".sh", ".csv", ".svg"}
MAX_FILE_SIZE = 1024 * 1024
MAX_TOTAL_SIZE = 100 * 1024 * 1024
MAX_FILES = 500
SECRET_PATTERNS = (
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"(?i)(api[_-]?key|secret|password)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{16,}"),
    re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
)


def _frontmatter(content: str, errors: list[str]) -> dict[str, str]:
    match = re.match(r"^---\r?\n(.*?)\r?\n---(?:\r?\n|$)", content, re.DOTALL)
    if not match:
        errors.append("SKILL.md frontmatter 格式无效")
        return {}
    fields: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        field_match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if not field_match:
            errors.append(f"frontmatter 无法解析：{line}")
            continue
        fields[field_match.group(1)] = field_match.group(2).strip().strip("\"'")
    unexpected = set(fields) - {"name", "description"}
    if unexpected:
        errors.append("frontmatter 含多余字段：" + ", ".join(sorted(unexpected)))
    name, description = fields.get("name", ""), fields.get("description", "")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name) or len(name) > 64:
        errors.append("name 必须是最多64字符的 kebab-case")
    if not description or len(description) > 1024 or "<" in description or ">" in description:
        errors.append("description 必须为1–1024字符且不能含尖括号")
    return fields


def _load_files(target: Path, errors: list[str]) -> tuple[dict[str, bytes], str, str]:
    files: dict[str, bytes] = {}
    if target.is_dir():
        for path in target.rglob("*"):
            if path.is_file():
                files[path.relative_to(target).as_posix()] = path.read_bytes()
        return files, "", target.name
    if target.suffix.lower() != ".zip" or not target.is_file():
        errors.append("目标必须是 Skill 目录或 ZIP")
        return files, "", ""
    try:
        with zipfile.ZipFile(target) as archive:
            bad = archive.testzip()
            if bad:
                errors.append(f"ZIP CRC 失败：{bad}")
            names = [item.filename for item in archive.infolist() if not item.is_dir()]
            for name in names:
                pure = PurePosixPath(name)
                if pure.is_absolute() or ".." in pure.parts or "\\" in name:
                    errors.append(f"ZIP 含不安全路径：{name}")
                    continue
                files[name] = archive.read(name)
    except zipfile.BadZipFile as exc:
        errors.append(f"ZIP 无效：{exc}")
        return {}, "", ""
    top = {PurePosixPath(name).parts[0] for name in files if PurePosixPath(name).parts}
    if "SKILL.md" in files:
        return files, "", ""
    if len(top) != 1:
        errors.append("ZIP 必须在根目录放 SKILL.md，或只包含一个同名顶层文件夹")
        return files, "", ""
    prefix = next(iter(top)) + "/"
    if prefix + "SKILL.md" not in files:
        errors.append("ZIP 顶层文件夹缺少 SKILL.md")
    return files, prefix, next(iter(top))


def validate(target: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    files, prefix, container_name = _load_files(target, errors)
    logical = {name[len(prefix):]: data for name, data in files.items() if name.startswith(prefix)}
    if "SKILL.md" not in logical:
        errors.append("根目录缺少 SKILL.md")
        return {"valid": False, "errors": errors, "warnings": warnings}

    file_count = len(logical)
    total_size = sum(len(data) for data in logical.values())
    if file_count > MAX_FILES:
        errors.append(f"文件数超过 {MAX_FILES}")
    if total_size > MAX_TOTAL_SIZE:
        errors.append("解压后总大小超过 100MB")

    decoded: dict[str, str] = {}
    for relative, data in logical.items():
        path = PurePosixPath(relative)
        suffix = path.suffix.lower()
        if suffix not in ALLOWED_EXTENSIONS:
            errors.append(f"不允许的文件类型：{relative}")
        if len(data) > MAX_FILE_SIZE:
            errors.append(f"文件超过 1MB：{relative}")
        if "__pycache__" in path.parts or path.name in {".DS_Store", "Thumbs.db"}:
            errors.append(f"包含临时文件：{relative}")
        if b"\x00" in data and suffix in TEXT_EXTENSIONS:
            errors.append(f"文本文件含 NUL：{relative}")
        if suffix in TEXT_EXTENSIONS:
            try:
                decoded[relative] = data.decode("utf-8-sig")
            except UnicodeDecodeError as exc:
                errors.append(f"文本不是 UTF-8：{relative}: {exc}")
        if suffix == ".py" and relative in decoded:
            try:
                ast.parse(decoded[relative], filename=relative)
            except SyntaxError as exc:
                errors.append(f"Python 语法无效：{relative}:{exc.lineno}: {exc.msg}")
        if suffix == ".json":
            try:
                json.loads(data.decode("utf-8-sig"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                errors.append(f"JSON 无效：{relative}: {exc}")

    fields = _frontmatter(decoded.get("SKILL.md", ""), errors)
    name = fields.get("name", "")
    if container_name and container_name != name:
        errors.append("目录名或 ZIP 顶层文件夹必须与 frontmatter name 一致")
    for required in ("README.md", "agents/interface.yaml", "references/input-output-schema.md", "scripts/validate_output.py"):
        if required not in logical:
            errors.append(f"缺少关键文件：{required}")
    yaml_text = decoded.get("agents/interface.yaml", "")
    for key in ("display_name:", "short_description:", "default_prompt:"):
        if key not in yaml_text:
            errors.append(f"agents/interface.yaml 缺少 {key[:-1]}")
    if name and f"${name}" not in yaml_text:
        errors.append("agents/interface.yaml default_prompt 未显式触发本 Skill")

    for relative, content in decoded.items():
        if any(pattern.search(content) for pattern in SECRET_PATTERNS):
            errors.append(f"疑似包含密钥：{relative}")
        if PurePosixPath(relative).suffix.lower() == ".md":
            for raw_target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", content):
                link_target = raw_target.split("#", 1)[0].strip().strip("<>")
                if not link_target or re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", link_target):
                    continue
                resolved = posixpath.normpath(posixpath.join(posixpath.dirname(relative), link_target))
                if resolved.startswith("../") or resolved not in logical:
                    errors.append(f"Markdown 链接目标不存在或越界：{relative} -> {raw_target}")
    return {
        "valid": not errors,
        "target_type": "zip" if target.suffix.lower() == ".zip" else "directory",
        "file_count": file_count,
        "uncompressed_bytes": total_size,
        "skill_name": name,
        "utf8_text_files": len(decoded),
        "errors": errors,
        "warnings": warnings,
    }


if __name__ == "__main__":
    package_target = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
    report = validate(package_target)
    sys.stdout.write(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    raise SystemExit(0 if report["valid"] else 1)
