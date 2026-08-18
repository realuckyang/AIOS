// 顶栏:菜单按钮 + 标题 + 更多(重命名 / 删除)。停止在输入区,跟着发送走。
import { memo, useState } from 'react';
import { Icon } from './Icon';

interface ChatHeaderProps {
  title: string;
  hasChat: boolean;
  pinned: boolean;
  onToggleSidebar: () => void;
  onPin: (pinned: boolean) => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export const ChatHeader = memo(function ChatHeader({ title, hasChat, pinned, onToggleSidebar, onPin, onRename, onDelete }: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null); // 非 null = 重命名弹层开着
  const [confirming, setConfirming] = useState(false); // 删除确认弹层

  const confirmRename = () => {
    const next = (draft ?? '').trim();
    setDraft(null);
    if (next && next !== title) onRename(next);
  };

  return (
    <header id="chat-header">
      <span id="header-left">
        <button className="icon-btn" title="切换侧边栏" aria-label="切换侧边栏" onClick={onToggleSidebar}>
          <Icon name="panel" size={16} />
        </button>
        <span id="chat-title">{title}</span>
      </span>
      <span id="chat-actions">
        {hasChat && (
          <span className="menu-wrap">
            <button
              className={`icon-btn${menuOpen ? ' on' : ''}`}
              title="更多"
              aria-label="更多"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Icon name="more" size={16} />
            </button>
            {menuOpen && (
              <>
                <span className="menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="menu" role="menu">
                  <button onClick={() => { setMenuOpen(false); onPin(!pinned); }}>
                    <Icon name="pin" size={14} /><span>{pinned ? '取消置顶' : '置顶'}</span>
                  </button>
                  <button onClick={() => { setMenuOpen(false); setDraft(title); }}>
                    <Icon name="pencil" size={14} /><span>重命名</span>
                  </button>
                  <button className="danger" onClick={() => { setMenuOpen(false); setConfirming(true); }}>
                    <Icon name="trash" size={14} /><span>删除</span>
                  </button>
                </div>
              </>
            )}
          </span>
        )}
      </span>

      {confirming && (
        <div className="modal-mask" role="dialog" aria-modal="true" onClick={() => setConfirming(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">删除这条对话?</h2>
            <p className="modal-text">「{title}」将被删除,无法恢复。</p>
            <div className="modal-foot">
              <button className="btn btn-plain" autoFocus onClick={() => setConfirming(false)}>取消</button>
              <button className="btn btn-danger" onClick={() => { setConfirming(false); onDelete(); }}>删除</button>
            </div>
          </div>
        </div>
      )}

      {draft !== null && (
        <div className="modal-mask" role="dialog" aria-modal="true" onClick={() => setDraft(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">重命名对话</h2>
            <input
              className="input"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) confirmRename();
                if (e.key === 'Escape') setDraft(null);
              }}
            />
            <div className="modal-foot">
              <button className="btn btn-plain" onClick={() => setDraft(null)}>取消</button>
              <button className="btn btn-primary" disabled={!(draft ?? '').trim()} onClick={confirmRename}>确定</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});
