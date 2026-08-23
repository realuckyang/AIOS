// Skills 目录:单列卡片列表,点进详情,返回回列表。
// 不做左右两栏 —— 一套布局通吃桌面和移动端。
import { useEffect, useState } from 'react';
import * as api from '../../../main/ui/api';
import type { SkillDetail, SkillSummary } from '../../../main/ui/types';
import { Markdown } from '../../../main/ui/components/Markdown';
import { Icon } from '../../../main/ui/components/Icon';

export default function Skills() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [selected, setSelected] = useState<SkillDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listSkills().then(setSkills).catch((e: Error) => setError(e.message));
  }, []);

  const open = (id: string) => {
    setError('');
    api.getSkill(id).then(setSelected).catch((e: Error) => setError(e.message));
  };

  return (
    <section className="catalog">
      <div className="catalog-inner">
        {error && <p className="settings-error">{error}</p>}

        {selected ? (
          <>
            <button className="catalog-back" onClick={() => setSelected(null)}>
              <Icon name="back" size={14} /><span>Skills</span>
            </button>
            <article className="catalog-detail">
              <header>
                <h2>{selected.displayName}</h2>
                <code>{selected.id}</code>
                {selected.shortDescription && <p>{selected.shortDescription}</p>}
                {selected.defaultPrompt && <pre>{selected.defaultPrompt}</pre>}
              </header>
              <div className="skill-markdown"><Markdown text={selected.content} /></div>
            </article>
          </>
        ) : (
          <>
            {skills.map((skill) => (
              <button key={skill.id} className="catalog-item" onClick={() => open(skill.id)}>
                <strong>{skill.displayName}</strong>
                <small>{skill.shortDescription || skill.description}</small>
              </button>
            ))}
            {!skills.length && !error && <p className="catalog-empty">暂无 Skills</p>}
          </>
        )}
      </div>
    </section>
  );
}
