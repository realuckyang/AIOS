import { db } from './client.js';

export const getPartiesByLang = (lang) => {
  return db.prepare(`
    SELECT id, name, candidate_name, policy, logo, support_rate, difficulty, win_count, lang, created_at
    FROM apps_debate_parties
    WHERE lang = ?
    ORDER BY support_rate DESC, id ASC
  `).all(lang);
};

export const getPartyByName = (name) => {
  return db.prepare('SELECT * FROM apps_debate_parties WHERE name = ?').get(name);
};

export const getSupportRateByParty = (name) => {
  return db.prepare(`
    SELECT support_rate AS supportRate
    FROM apps_debate_parties
    WHERE name = ?
    LIMIT 1
  `).get(name);
};

export const incrementWinCount = (name) => {
  const party = db.prepare('SELECT * FROM apps_debate_parties WHERE name = ?').get(name);
  if (party) {
    db.prepare('UPDATE apps_debate_parties SET win_count = ? WHERE name = ?')
      .run(Number(party.win_count || 0) + 1, name);
  }
};
