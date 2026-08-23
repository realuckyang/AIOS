# 人工复核契约

`manual_checked` 只用于 `verify_math_item.py` 返回 `unsupported` 的题型。模型输出中的自报状态和自由文本 `method` 不是复核证据。

人工复核文件必须由独立复核者提供，并以题目和答案的规范化 SHA-256 绑定内容：

```json
{
  "reviews": [
    {
      "item_sha256": "64位小写十六进制哈希",
      "status": "manual_checked",
      "reviewer_role": "math_teacher",
      "checked_at": "2026-08-14",
      "note": "独立求解并检查唯一性"
    }
  ]
}
```

正式校验命令：

```text
python scripts/validate_output.py output.json --case source.json --manual-review manual-review.json
```

以下情况必须失败：

- 自动复核结果为 `invalid`；
- 自动支持的题型使用 `manual_checked` 绕过复算；
- 缺少人工复核文件；
- `item_sha256` 与当前题目答案不一致；
- 复核记录缺少 `reviewer_role`。

人工记录只能证明有人复核过当前内容，不能证明学习效果或教师资格。公开材料仍应说明复核范围。
