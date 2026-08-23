// 待办:第一个归类为「应用」的视图。数据在 App 的 todos 表,经 /api/todos 读写;
// agent 用同一组端点,所以「让 AI 整理我的待办」不需要任何额外机制。
//
// 交互约定:
//   顶部输入行回车即添加;勾选圈完成/撤销;标题点击进入行内编辑
//   (Enter 保存、Esc 放弃、失焦保存);删除按钮悬停才出现。
//   所有写操作乐观更新,失败回滚并在顶部亮一条错误。
import { useEffect, useRef, useState } from 'react';
import * as api from '../../../main/ui/api';
import type { Todo } from '../../../main/ui/types';
import { Icon } from '../../../main/ui/components/Icon';
import './todo.css';

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const composing = useRef(false);

  useEffect(() => {
    api.listTodos().then((list) => { setTodos(list); setLoaded(true); })
      .catch((e: Error) => { setError(e.message); setLoaded(true); });
  }, []);

  /** 乐观更新:先改本地,失败回滚到调用前的快照。 */
  const apply = (next: Todo[], action: () => Promise<unknown>) => {
    const before = todos;
    setError('');
    setTodos(next);
    action().catch((e: Error) => { setTodos(before); setError(e.message); });
  };

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    setDraft('');
    setError('');
    // 创建拿的是服务端 id,不能纯乐观;失败把草稿还给输入框
    api.createTodo(title)
      .then((todo) => setTodos((current) => [todo, ...current]))
      .catch((e: Error) => { setError(e.message); setDraft(title); });
  };

  const toggle = (todo: Todo) => {
    const done = !todo.done;
    apply(
      todos.map((one) => (one.id === todo.id ? { ...one, done, updated_at: new Date().toISOString() } : one)),
      () => api.patchTodo(todo.id, { done }),
    );
  };

  const remove = (todo: Todo) => {
    apply(todos.filter((one) => one.id !== todo.id), () => api.deleteTodo(todo.id));
  };

  const saveEdit = () => {
    if (!editing) return;
    const { id, title } = editing;
    setEditing(null);
    const trimmed = title.trim();
    const current = todos.find((one) => one.id === id);
    if (!current || !trimmed || trimmed === current.title) return;
    apply(
      todos.map((one) => (one.id === id ? { ...one, title: trimmed } : one)),
      () => api.patchTodo(id, { title: trimmed }),
    );
  };

  const clearDone = () => {
    apply(todos.filter((one) => !one.done), () => api.clearDoneTodos());
  };

  const open = todos.filter((one) => !one.done);
  const done = todos.filter((one) => one.done)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const row = (todo: Todo) => (
    <li key={todo.id} className={`todo-row${todo.done ? ' done' : ''} rise-enter`}>
      <button
        className="todo-check"
        aria-label={todo.done ? '标记未完成' : '标记完成'}
        onClick={() => toggle(todo)}
      >
        <Icon name="check" size={12} />
      </button>
      {editing?.id === todo.id ? (
        <input
          className="todo-edit"
          autoFocus
          value={editing.title}
          onChange={(e) => setEditing({ id: todo.id, title: e.target.value })}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) saveEdit();
            if (e.key === 'Escape') setEditing(null);
          }}
        />
      ) : (
        <span className="todo-title" onClick={() => !todo.done && setEditing({ id: todo.id, title: todo.title })}>
          {todo.title}
        </span>
      )}
      <button className="todo-del" aria-label="删除" onClick={() => remove(todo)}>
        <Icon name="trash" size={13} />
      </button>
    </li>
  );

  return (
    <section id="todo-app">
      <div className="todo-inner">
        <div className="todo-compose">
          <input
            value={draft}
            placeholder="添加待办,回车确认"
            onChange={(e) => setDraft(e.target.value)}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={() => { composing.current = false; }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !composing.current) add(); }}
          />
          <button className="todo-add" aria-label="添加" disabled={!draft.trim()} onClick={add}>
            <Icon name="plus" size={15} />
          </button>
        </div>

        {error && <p className="todo-error">{error}</p>}

        {loaded && !todos.length && !error && (
          <div className="todo-blank">
            <Icon name="check" size={22} />
            <p>还没有待办</p>
          </div>
        )}

        {open.length > 0 && (
          <>
            <div className="todo-section">进行中 · {open.length}</div>
            <ul className="todo-list">{open.map(row)}</ul>
          </>
        )}

        {done.length > 0 && (
          <>
            <div className="todo-section">
              <span>已完成 · {done.length}</span>
              <button className="todo-clear" onClick={clearDone}>清除</button>
            </div>
            <ul className="todo-list">{done.map(row)}</ul>
          </>
        )}
      </div>
    </section>
  );
}
