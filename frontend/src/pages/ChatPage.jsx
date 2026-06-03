import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import ReactMarkdown from 'react-markdown';
import { Send, Plus, Trash2, MessageSquare, Bot, User } from 'lucide-react';

export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  const loadSessions = async () => {
    try {
      const data = await api.getChatSessions();
      setSessions(data);
    } catch {}
  };

  const loadMessages = async (sessionId) => {
    try {
      const data = await api.getChatMessages(sessionId);
      setMessages(data);
      setActiveSession(sessionId);
    } catch {}
  };

  const handleNewChat = () => {
    setActiveSession(null);
    setMessages([]);
    setStreamingText('');
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await api.deleteChatSession(sessionId);
      if (activeSession === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
      await loadSessions();
    } catch {}
  };

  const handleSend = async () => {
    if (!input.trim() || streaming) return;

    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setStreamingText('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg.content, session_id: activeSession }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              accumulated += data.content;
              setStreamingText(accumulated);
            } else if (data.type === 'session_id') {
              setActiveSession(data.session_id);
              await loadSessions();
            } else if (data.type === 'done') {
              if (accumulated) {
                setMessages((prev) => [...prev, { role: 'assistant', content: accumulated }]);
                setStreamingText('');
              }
            }
          } catch {}
        }
      }
    } catch {}
    setStreaming(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex">
      <div className="w-56 border-r border-border bg-bg-secondary flex flex-col">
        <div className="p-3 border-b border-border">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-accent text-white hover:bg-accent/90"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => loadMessages(s.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left mb-1 group ${
                activeSession === s.id
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-secondary hover:bg-bg-tertiary'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 truncate">{s.title || 'Untitled'}</span>
              <Trash2
                onClick={(e) => handleDeleteSession(e, s.id)}
                className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !streamingText && (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <Bot className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Start a conversation with AutoPilot.</p>
              <p className="text-xs mt-1">I can search the web, write code, analyze data, and more.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? '' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-text-muted" />
                ) : (
                  <Bot className="w-4 h-4 text-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {msg.role === 'user' ? (
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="text-sm text-text-secondary prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {streamingText && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0 text-sm text-text-secondary prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{streamingText}</ReactMarkdown>
                <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="flex gap-3 max-w-3xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AutoPilot..."
              rows={1}
              className="flex-1 bg-bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted outline-none resize-none focus:border-accent/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className="px-4 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
