import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, FileText, GitBranch, BookOpen, Bot, Webhook, Users, ArrowRight,
  Plus, MessageSquare, BarChart3, Settings, Clock, Star, HeartPulse, Shield,
} from 'lucide-react';
import { api } from '../api/client';

const TYPE_CONFIG = {
  task: { icon: FileText, color: 'text-blue-400' },
  pipeline: { icon: GitBranch, color: 'text-purple-400' },
  knowledge: { icon: BookOpen, color: 'text-green-400' },
  profile: { icon: Bot, color: 'text-amber-400' },
  webhook: { icon: Webhook, color: 'text-cyan-400' },
  team: { icon: Users, color: 'text-pink-400' },
};

const QUICK_ACTIONS = [
  { id: 'new-task', label: 'New Task', icon: Plus, link: '/' },
  { id: 'chat', label: 'Chat', icon: MessageSquare, link: '/chat' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, link: '/analytics' },
  { id: 'schedules', label: 'Schedules', icon: Clock, link: '/schedules' },
  { id: 'favorites', label: 'Favorites', icon: Star, link: '/favorites' },
  { id: 'health', label: 'System Health', icon: HeartPulse, link: '/health' },
  { id: 'audit', label: 'Audit Log', icon: Shield, link: '/audit' },
  { id: 'settings', label: 'Settings', icon: Settings, link: '/settings' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback(async (q) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.globalSearch(q);
      setResults(data.results || []);
      setSelectedIdx(0);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  const allItems = query.length < 2
    ? QUICK_ACTIONS.map((a) => ({ ...a, type: 'action' }))
    : results;

  const handleSelect = (item) => {
    setOpen(false);
    navigate(item.link);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allItems[selectedIdx]) {
      handleSelect(allItems[selectedIdx]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted"
            placeholder="Search tasks, pipelines, docs... or type a command"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="text-[10px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto">
          {loading && (
            <p className="text-center text-text-muted text-sm py-4">Searching...</p>
          )}

          {!loading && allItems.length === 0 && query.length >= 2 && (
            <p className="text-center text-text-muted text-sm py-6">No results found</p>
          )}

          {!loading && query.length < 2 && (
            <div className="px-3 py-2">
              <p className="text-[11px] text-text-muted px-2 py-1">Quick Actions</p>
            </div>
          )}

          {allItems.map((item, idx) => {
            const isAction = item.type === 'action';
            const config = TYPE_CONFIG[item.type];
            const Icon = isAction ? item.icon : (config?.icon || FileText);
            const color = isAction ? 'text-accent' : (config?.color || 'text-text-muted');

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  idx === selectedIdx ? 'bg-accent/10' : 'hover:bg-bg-tertiary/50'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">
                    {item.title || item.label}
                  </p>
                  {item.subtitle && (
                    <p className="text-[11px] text-text-muted truncate">{item.subtitle}</p>
                  )}
                </div>
                {!isAction && (
                  <span className="text-[10px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded capitalize">
                    {item.type}
                  </span>
                )}
                <ArrowRight className="w-3 h-3 text-text-muted flex-shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between">
          <div className="flex gap-3">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <kbd className="bg-bg-tertiary px-1 py-0.5 rounded border border-border text-[9px]">↑↓</kbd> Navigate
            </span>
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <kbd className="bg-bg-tertiary px-1 py-0.5 rounded border border-border text-[9px]">↵</kbd> Select
            </span>
          </div>
          <span className="text-[10px] text-text-muted">
            <kbd className="bg-bg-tertiary px-1 py-0.5 rounded border border-border text-[9px]">⌘K</kbd> to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
