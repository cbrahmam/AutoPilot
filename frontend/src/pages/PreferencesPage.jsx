import { useEffect, useState } from 'react';
import {
  SlidersHorizontal, Save, RotateCcw, Bell, Cpu, Eye, Clock, Loader2,
} from 'lucide-react';
import { api } from '../api/client';

const MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  { value: 'claude-haiku-4-20250514', label: 'Claude Haiku 4' },
];

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      setPrefs(await api.getPreferences());
      setDirty(false);
    } catch {}
    setLoading(false);
  };

  const update = (key, value) => {
    setPrefs({ ...prefs, [key]: value });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const toSave = { ...prefs };
    delete toSave.user_id;
    delete toSave.updated_at;
    try {
      await api.savePreferences(toSave);
      setDirty(false);
    } catch {}
    setSaving(false);
  };

  const handleReset = async () => {
    try {
      setPrefs(await api.resetPreferences());
      setDirty(false);
    } catch {}
  };

  if (loading || !prefs) return <p className="text-center text-text-muted py-12">Loading preferences...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Preferences</h1>
            <p className="text-sm text-text-muted">Customize your AutoPilot experience</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 bg-bg-tertiary text-text-primary rounded-lg text-sm hover:bg-border">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      {/* Execution Defaults */}
      <section className="border border-border rounded-xl bg-bg-secondary p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-medium text-text-primary">Execution Defaults</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-text-muted block mb-1">Default Model</label>
            <select
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
              value={prefs.default_model}
              onChange={(e) => update('default_model', e.target.value)}
            >
              {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">Max Iterations</label>
            <input
              type="number"
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
              value={prefs.default_max_iterations}
              onChange={(e) => update('default_max_iterations', parseInt(e.target.value) || 25)}
              min={1} max={100}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={prefs.default_require_approval} onChange={(e) => update('default_require_approval', e.target.checked)} className="accent-accent" />
          Require approval by default
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={prefs.auto_execute} onChange={(e) => update('auto_execute', e.target.checked)} className="accent-accent" />
          Auto-execute tasks after creation
        </label>
      </section>

      {/* Notifications */}
      <section className="border border-border rounded-xl bg-bg-secondary p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-medium text-text-primary">Notifications</h2>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={prefs.notifications_enabled} onChange={(e) => update('notifications_enabled', e.target.checked)} className="accent-accent" />
          Enable notifications
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer ml-5">
          <input type="checkbox" checked={prefs.notification_on_complete} onChange={(e) => update('notification_on_complete', e.target.checked)} className="accent-accent" disabled={!prefs.notifications_enabled} />
          Notify on task completion
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer ml-5">
          <input type="checkbox" checked={prefs.notification_on_failure} onChange={(e) => update('notification_on_failure', e.target.checked)} className="accent-accent" disabled={!prefs.notifications_enabled} />
          Notify on task failure
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer ml-5">
          <input type="checkbox" checked={prefs.notification_on_approval} onChange={(e) => update('notification_on_approval', e.target.checked)} className="accent-accent" disabled={!prefs.notifications_enabled} />
          Notify on approval requests
        </label>
      </section>

      {/* Display */}
      <section className="border border-border rounded-xl bg-bg-secondary p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-medium text-text-primary">Display</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-text-muted block mb-1">Tasks per page</label>
            <select
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
              value={prefs.tasks_per_page}
              onChange={(e) => update('tasks_per_page', parseInt(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">Date format</label>
            <select
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
              value={prefs.date_format}
              onChange={(e) => update('date_format', e.target.value)}
            >
              <option value="relative">Relative (2h ago)</option>
              <option value="absolute">Absolute (Jun 21, 2026)</option>
              <option value="iso">ISO (2026-06-21)</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={prefs.show_token_usage} onChange={(e) => update('show_token_usage', e.target.checked)} className="accent-accent" />
          Show token usage
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={prefs.show_cost_estimates} onChange={(e) => update('show_cost_estimates', e.target.checked)} className="accent-accent" />
          Show cost estimates
        </label>
      </section>

      {/* Time */}
      <section className="border border-border rounded-xl bg-bg-secondary p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-medium text-text-primary">Regional</h2>
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1">Timezone</label>
          <select
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
            value={prefs.timezone}
            onChange={(e) => update('timezone', e.target.value)}
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern (ET)</option>
            <option value="America/Chicago">Central (CT)</option>
            <option value="America/Denver">Mountain (MT)</option>
            <option value="America/Los_Angeles">Pacific (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Berlin">Berlin (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Asia/Kolkata">India (IST)</option>
          </select>
        </div>
      </section>

      {prefs.updated_at && (
        <p className="text-xs text-text-muted text-center">
          Last saved: {new Date(prefs.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
