import { db } from './client.js';
import { getSystemLanguage } from '../../app_shared/settings/language.js';

const NOTEBOOK_SEEDS_BY_LANGUAGE = {
  zh: [
    `随心记

想到什么就写，不用在意格式。
右侧 ✦ 可以让 AI 帮你润色，置顶把重要的钉在最上面。

你写在这里的东西，AIOS 也能看到。
聊天时它了解你在想什么、关注什么，
给你的回应会更贴合你自己。`,

    `碎片也值得被留下

灵感不会等你准备好。
一个词、半句话、还没想清楚的念头——
先扔进来，不要管它够不够完整。

有时候几周后再看，
才发现当时随手写的那句话，
正好是你现在需要的答案。`,

    `值得慢慢想的事

什么样的一天，结束时不觉得空？
什么事情，是只有自己才能做的？
什么时候，感觉最像自己？

不用现在回答。
写下来，留着。`
  ],
  en: [
    `Free Notes

Write whatever comes to mind. Format can wait.
Use the ✦ button to polish with AI, and pin what matters most.

Everything here is visible to AIOS too.
When you chat, it can better understand what you care about
and give responses that fit you better.`,

    `Fragments Matter

Ideas do not wait for perfect timing.
A single word, half a sentence, an unfinished thought —
drop it here first, and keep moving.

Weeks later, you may realize
the line you wrote casually
was exactly what you needed now.`,

    `Questions Worth Keeping

What kind of day feels full when it ends?
What work can only you do?
When do you feel most like yourself?

You do not need answers now.
Write them down and keep them.`
  ]
};

const initNotebookTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL DEFAULT '',
      style INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
};

const seedNotebookIfEmpty = () => {
  const count = db.prepare('SELECT COUNT(*) as c FROM notes').get().c;
  if (count !== 0) return;
  const language = getSystemLanguage();
  const seeds = NOTEBOOK_SEEDS_BY_LANGUAGE[language];
  if (!seeds) {
    throw new Error(`Unsupported system language: ${language}`);
  }

  const insert = db.prepare(`
    INSERT INTO notes (content, style, created_at, updated_at)
    VALUES (?, ?, datetime('now'), datetime('now'))
  `);
  for (const content of seeds) {
    insert.run(content, Math.floor(Math.random() * 8));
  }
};

export const initNotebookDatabase = () => {
  initNotebookTables();
  seedNotebookIfEmpty();
};
