import { useEffect, useState } from 'react';
import {
  Shield, Download, RefreshCw, Filter, BarChart3, User, Clock, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { api } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ACTION_COLORS = {
  'task.create': 'bg-blue-500/20 text-blue-400',
  'vault.key_create': 'bg-green-500/20 text-green-400',
  'vault.key_delete': 'bg-red-500/20 text-red-400',
  'approval.rule_create': 'bg-purple-500/20 text-purple-400',
  'approval.approved': 'bg-emerald-500/20 text-emerald-400',
  'approval.rejected': 'bg-orange-500/20 text-orange-400',
};

function ActionBadge({ action }) {
  const color = ACTION_COLORS[action] || 'bg-gray-500/20 text-gray-400';
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${color}`}>
      {action}
    </span>
  );
}

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', target_type: '', user_id: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState('logs');
  const PAGE_SIZE = 50;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        api.getAuditLogs({ limit: PAGE_SIZE, offset: 0 }),
        api.getAuditStats(),
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch {}
    setLoading(false);
  };

  const loadLogs = async () => {
    try {
      const data = await api.getAuditLogs({
        ...filters,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setLogs(data);
    } catch {}
  };

  const handleFilter = () => {
    setPage(0);
    loadLogs();
  };

  const clearFilters = () => {
    setFilters({ action: '', target_type: '', user_id: '' });
    setPage(0);
  };

  const handleExport = () => {
    window.open(api.exportAuditCsv(filters), '_blank');
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Audit Log</h1>
            <p className="text-sm text-text-muted">Track all system actions and changes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary text-text-primary rounded-lg text-sm hover:bg-border"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'logs', label: 'Event Log', icon: Clock },
          { id: 'stats', label: 'Statistics', icon: BarChart3 },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'logs' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${
                showFilters ? 'border-accent text-accent bg-accent/5' : 'border-border text-text-muted hover:text-text-primary'
              }`}
            >
              <Filter className="w-3.5 h-3.5" /> Filters
            </button>
            {(filters.action || filters.target_type || filters.user_id) && (
              <button onClick={clearFilters} className="text-xs text-accent hover:underline">
                Clear all
              </button>
            )}
            <span className="text-xs text-text-muted ml-auto">
              {stats ? `${stats.total} total events` : ''}
            </span>
          </div>

          {showFilters && (
            <div className="border border-border rounded-xl bg-bg-secondary p-4 flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-text-muted block mb-1">Action</label>
                <input
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm"
                  placeholder="e.g. task.create"
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-text-muted block mb-1">Target Type</label>
                <input
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm"
                  placeholder="e.g. task, vault_key"
                  value={filters.target_type}
                  onChange={(e) => setFilters({ ...filters, target_type: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-text-muted block mb-1">User ID</label>
                <input
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm"
                  placeholder="Filter by user"
                  value={filters.user_id}
                  onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                />
              </div>
              <button
                onClick={handleFilter}
                className="px-4 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
              >
                Apply
              </button>
            </div>
          )}

          {/* Log Table */}
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-secondary border-b border-border">
                  <th className="text-left px-4 py-2.5 text-text-muted font-medium">Timestamp</th>
                  <th className="text-left px-4 py-2.5 text-text-muted font-medium">Action</th>
                  <th className="text-left px-4 py-2.5 text-text-muted font-medium">Target</th>
                  <th className="text-left px-4 py-2.5 text-text-muted font-medium">User</th>
                  <th className="text-left px-4 py-2.5 text-text-muted font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-muted">Loading...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                      No audit events found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-bg-secondary/50 transition-colors">
                      <td className="px-4 py-2.5 text-text-muted text-xs font-mono whitespace-nowrap">
                        {formatTime(log.created_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-4 py-2.5">
                        {log.target_type && (
                          <span className="text-text-secondary text-xs">
                            {log.target_type}
                            {log.target_id && (
                              <span className="text-text-muted font-mono ml-1">
                                {log.target_id.substring(0, 8)}...
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-text-secondary text-xs flex items-center gap-1">
                          <User className="w-3 h-3 text-text-muted" />
                          {log.user_email || log.user_id || 'system'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-text-muted text-xs max-w-xs truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
              Page {page + 1} · Showing {logs.length} results
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={logs.length < PAGE_SIZE}
                className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-30"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {tab === 'stats' && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Total Events */}
          <div className="border border-border rounded-xl bg-bg-secondary p-5">
            <h3 className="text-sm font-medium text-text-primary mb-1">Total Events</h3>
            <p className="text-3xl font-bold text-accent">{stats.total.toLocaleString()}</p>
          </div>

          {/* Daily Activity */}
          <div className="border border-border rounded-xl bg-bg-secondary p-5">
            <h3 className="text-sm font-medium text-text-primary mb-3">Daily Activity (Last 7 Days)</h3>
            {stats.daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={stats.daily}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} width={30} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                    labelStyle={{ color: '#888' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-text-muted">No daily data yet</p>
            )}
          </div>

          {/* Top Actions */}
          <div className="border border-border rounded-xl bg-bg-secondary p-5">
            <h3 className="text-sm font-medium text-text-primary mb-3">Top Actions</h3>
            <div className="space-y-2">
              {stats.top_actions.length > 0 ? (
                stats.top_actions.map((a) => (
                  <div key={a.action} className="flex items-center justify-between">
                    <ActionBadge action={a.action} />
                    <span className="text-sm font-mono text-text-secondary">{a.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted">No actions recorded yet</p>
              )}
            </div>
          </div>

          {/* Top Users */}
          <div className="border border-border rounded-xl bg-bg-secondary p-5">
            <h3 className="text-sm font-medium text-text-primary mb-3">Most Active Users</h3>
            <div className="space-y-2">
              {stats.top_users.length > 0 ? (
                stats.top_users.map((u) => (
                  <div key={u.user_email} className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-text-muted" />
                      {u.user_email}
                    </span>
                    <span className="text-sm font-mono text-text-secondary">{u.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted">No user data yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
