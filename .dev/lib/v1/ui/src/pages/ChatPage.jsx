import { useEffect, useState } from 'react';
import { subscribe } from '../events.js';
import { Composer } from '../components/chat/Composer.jsx';
import { Thread } from '../components/chat/Thread.jsx';
import { ChatPanel } from '../components/call/ChatPanel.jsx';
import { Header } from '../components/layout/Header.jsx';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { useCalls } from '../hooks/useCalls.js';
import { useChat } from '../hooks/useChat.js';
import { useChats } from '../hooks/useChats.js';
import { SettingsPage } from './SettingsPage.jsx';

export function ChatPage() {
  const list = useChats();
  const [chatId, setChatId] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [page, setPage] = useState('chat');
  const chat = useChat(chatId);
  const calls = useCalls(chatId);

  useEffect(() => {
    if (!chatId && !drafting && list.chats[0]) setChatId(list.chats[0].id);
  }, [list.chats, chatId, drafting]);
  useEffect(() => subscribe((event) => { list.apply(event); chat.apply(event); calls.apply(event); }), [chatId]);

  const create = () => {
    setChatId('');
    setDrafting(true);
    setPage('chat');
    setPanelOpen(false);
  };
  const send = async (text) => {
    if (chatId) { await chat.send(text); return; }
    const one = await list.create({ message: text });
    setChatId(one.id);
    setDrafting(false);
  };
  const remove = async (id) => {
    await list.remove(id);
    if (id === chatId) { setChatId(''); setDrafting(false); }
  };
  const select = (id) => { setChatId(id); setDrafting(false); setPage('chat'); };
  const shellClass = `shell${sidebarOpen ? '' : ' sidebar-hidden'}${page === 'chat' && panelOpen ? ' panel-open' : ''}`;

  return (
    <div className={shellClass}>
      <Sidebar
        chats={list.chats}
        currentId={page === 'chat' ? chatId : ''}
        settingsActive={page === 'settings'}
        onSelect={select}
        onCreate={create}
        onRemove={remove}
        onSettings={() => { setPage('settings'); setPanelOpen(false); }}
        onToggleSidebar={() => setSidebarOpen(false)}
      />
      {page === 'settings' ? (
        <SettingsPage sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(true)} />
      ) : (
        <>
          <section className="workspace">
            <Header
              chat={chat.chat}
              panelOpen={panelOpen}
              sidebarOpen={sidebarOpen}
              onTogglePanel={() => setPanelOpen((v) => !v)}
              onToggleSidebar={() => setSidebarOpen(true)}
            />
            <Thread {...chat} />
            <Composer running={chat.chat?.status === 'running'} items={chat.items} onSend={send} onStop={chat.stop} />
          </section>
          <ChatPanel
            open={panelOpen}
            chats={calls.chats}
            calls={calls.calls}
            onClose={() => setPanelOpen(false)}
          />
        </>
      )}
    </div>
  );
}
