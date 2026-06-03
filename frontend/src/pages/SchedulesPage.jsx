import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 9am', value: '0 9 * * *' },
  { label: 'Every Monday', value: '0 9 * * 1' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', goal: '', cron_expr: '0 9 * * *', max_iterations: 25 });

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const data = await api.getSchedules();
      setSchedules(data);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.goal) return;
    try {
      await api.createSchedule(form);
      setShowForm(false);
      setForm({ name: '', goal: '', cron_expr: '0 9 * * *', max_iterations: 25 });
      await loadSchedules();
    } catch {}
  };

  const handleToggle = async (id, currentEnabled) => {
    try {
      await api.updateSchedule(id, { enabled: !currentEnabled });
      await loadSchedules();
    } catch {}
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteSchedule(id);
      await loadSchedules();
    } catch {}
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Scheduled Tasks</h2>
          <p className="text-sm text-text-muted mt-1">Automatically run tasks on a cron schedule.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-accent text-white hover:bg-accent/90"
        >
          <Plus className="w-4 h-4" />
          New Schedule
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 rounded-lg border border-border bg-bg-secondary space-y-3">
          <input
            type="text"
            placeholder="Schedule name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none"
          />
          <textarea
            placeholder="Task goal (what the agents should do)"
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
            rows={2}
            className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none resize-none"
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Cron expression</label>
              <input
                type="text"
                value={form.cron_expr}
                onChange={(e) => setForm({ ...form, cron_expr: e.target.value })}
                className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Presets</label>
              <select
                onChange={(e) => setForm({ ...form, cron_expr: e.target.value })}
                className="bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-secondary outline-none"
              >
                {CRON_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm rounded-md text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-1.5 text-sm rounded-md bg-accent text-white hover:bg-accent/90"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 rounded-lg border border-border bg-bg-secondary">
              <div className="skeleton h-4 w-1/3 mb-2" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No scheduled tasks yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="p-4 rounded-lg border border-border bg-bg-secondary flex items-center gap-4">
              <button onClick={() => handleToggle(s.id, s.enabled)} className="shrink-0">
                {s.enabled ? (
                  <ToggleRight className="w-6 h-6 text-green-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-text-muted" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-text-primary">{s.name}</h3>
                  <code className="text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded">{s.cron_expr}</code>
                </div>
                <p className="text-xs text-text-muted mt-0.5 truncate">{s.goal}</p>
                <p className="text-xs text-text-muted mt-1">
                  Runs: {s.run_count || 0}
                  {s.last_run && <> &middot; Last: {new Date(s.last_run).toLocaleString()}</>}
                </p>
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="shrink-0 p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
