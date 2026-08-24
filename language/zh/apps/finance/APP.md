---
name: finance
description: 记账本 - 拟物存折式月度收支账本,记一笔/编辑/删除,行内编辑日期/摘要/金额。数据在 finance_transactions。
backend: server/apps/finance
frontend: ui/src/apps/finance
database: database/apps/finance.db
---

# 记账本(finance)

存折拟物风格的月度账本应用。

- 红色硬皮书脊 + 米白格纹内页 + 脊缝阴影
- 顶部月份头(prev/next 月切换)+ 收入/支出/月末结余三块汇总(高亮"月末结余"黄签)
- 流水表:日期 / 摘要 / 支出 / 收入,所有单元格点击即编辑(回车保存,Esc 取消)
- 最末一行常驻"录入行",回车直接入账
- 数字、日期统一 dot-matrix(Courier 仿打印机字体)
- 月末结余 = 上月结余 + 本月收入 - 本月支出

## API

- `GET  /apps/finance/list?month=YYYY-MM` 月度流水 + 上月结转余额 + 总收入/总支出
- `POST /apps/finance/create` `{type, amount, note, date}`
- `POST /apps/finance/update` `{id, type?, amount?, note?, date?}`
- `POST /apps/finance/delete` `{id}`

## 数据表

`finance_transactions(id, type CHECK(income|expense), amount, note, date)`
