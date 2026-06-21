import { useEffect, useState } from 'react';
import {
  Clock, RefreshCw, Filter, ChevronLeft, ChevronRight, FileText, Shield, Webhook, GitBranch, Users, Bot, Zap,
} from 'lucide-react';
import { api } from '../api/client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const EVENT_ICONS = {
  task: FileText,
  audit: Shield,
  webhook: Webhook,
  pipeline: GitBranch,
  team: Users,
  agent: Bot,
};

const EVENT_COLORS = {
  task: 'border-blue-500 bg-blue-500',
  audit: 'border-purple-500 bg-purple-500',
  webhook: 'border-cyan-500 bg-cyan-500',
  pipeline: 'border-green-500 bg-green-500',
  team: 'border-pink-500 bg-pink-500',
  agent: 'border-amber-500 bg-amber-500',
};

export default function TimelinePage() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ event_type: '', source: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadEvents(); }, [page, filters]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [e, s] = await Promise.all([
        api.getTimelineEvents({ limit: PAGE_SIZE }),
        api.getTimelineStats(),
      ]);
      setEvents(e);
      setStats(s);
    } catch {}
    setLoading(false);
  };

  const loadEvents = async () => {
    try {
      setEvents(await api.getTimelineEvents({ ...filters, limit: PAGE_SIZE, offset: page * PAGE_SIZE }));
    } catch {}
  };

  const handleRebuild = async () => {
    await api.rebuildTimeline();
    loadAll();
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const getSource = (event) => event.source || event.event_type.split('.')[0] || 'system';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Activity Timeline</h1>
            <p className="text-sm text-text-muted">
              {stats ? `${stats.total} events recorded` : 'Visual history of system events'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border ${
              showFilters ? 'border-accent text-accent' : 'border-border text-text-muted hover:text-text-primary'
            }`}
          >
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button onClick={handleRebuild} className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90">
            <RefreshCw className="w-4 h-4" /> Rebuild
          </button>
        </div>
      </div>

      {/* Stats Chart */}
      {stats && stats.daily.length > 0 && (
        <div className="border border-border rounded-xl bg-bg-secondary p-4">
          <h3 className="text-xs text-text-muted font-medium mb-2">Activity Over Time</h3>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={stats.daily}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#888' }} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} width={25} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#f97316" fill="#f97316" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {showFilters && (
        <div className="border border-border rounded-xl bg-bg-secondary p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-text-muted block mb-1">Event Type</label>
            <input
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm"
              placeholder="e.g. task.created"
              value={filters.event_type}
              onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-text-muted block mb-1">Source</label>
            <input
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm"
              placeholder="e.g. task, audit"
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            />
          </div>
          <button onClick={() => { setFilters({ event_type: '', source: '' }); setPage(0); }} className="px-3 py-1.5 text-xs text-accent hover:underline">
            Clear
          </button>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <p className="text-center text-text-muted py-8">Loading timeline...</p>
      ) : events.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-xl bg-bg-secondary">
          <Clock className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No events yet</p>
          <p className="text-text-muted text-xs mt-1">Click Rebuild to import existing activity</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-1">
            {events.map((event) => {
              const src = getSource(event);
              const Icon = EVENT_ICONS[src] || Zap;
              const colorClass = EVENT_COLORS[src] || 'border-gray-500 bg-gray-500';
              return (
                <div key={event.id} className="relative flex items-start gap-4 pl-10 py-2">
                  <div className={`absolute left-3.5 top-3 w-3 h-3 rounded-full border-2 ${colorClass}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <p className="text-sm text-text-primary truncate">{event.title}</p>
                    </div>
                    {event.description && (
                      <p className="text-xs text-text-muted mt-0.5 truncate">{event.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] bg-bg-tertiary px-1.5 py-0.5 rounded text-text-muted">{event.event_type}</span>
                      <span className="text-[10px] text-text-muted">{formatTime(event.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {events.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Page {page + 1}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button onClick={() => setPage(page + 1)} disabled={events.length < PAGE_SIZE} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-30">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
