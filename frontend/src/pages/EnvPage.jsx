import { useEffect, useState } from 'react';
import {
  Variable, Plus, Trash2, Edit3, Save, X, Eye, EyeOff, Lock, Globe, FileText,
} from 'lucide-react';
import { api } from '../api/client';

const SCOPE_LABELS = {
  global: { label: 'Global', icon: Globe, color: 'text-blue-400' },
  task: { label: 'Task', icon: FileText, color: 'text-green-400' },
};

export default function EnvPage() {
  const [vars, setVars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ name: '', value: '', scope: 'global', scope_id: '', encrypted: false });

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try { setVars(await api.getEnvVars(filter || undefined)); } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.value) return;
    await api.createEnvVar(form);
    setForm({ name: '', value: '', scope: 'global', scope_id: '', encrypted: false });
    setShowCreate(false);
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await api.updateEnvVar(editing, form);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    await api.deleteEnvVar(id);
    load();
  };

  const handleReveal = async (id) => {
    try {
      const data = await api.revealEnvVar(id);
      setRevealed({ ...revealed, [id]: data.value });
    } catch {}
  };

  const startEdit = (v) => {
    setEditing(v.id);
    setForm({ name: v.name, value: '', scope: v.scope, scope_id: v.scope_id || '', encrypted: !!v.encrypted });
    setShowCreate(false);
  };

  const renderForm = (onSave, onCancel) => (
    <div className="border border-border rounded-xl bg-bg-secondary p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-text-muted block mb-1">Name</label>
          <input
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm font-mono"
            placeholder="MY_VARIABLE"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
          />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1">Scope</label>
          <select
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value })}
          >
            <option value="global">Global</option>
            <option value="task">Task-specific</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-1">Value</label>
        <input
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm font-mono"
          placeholder="Variable value"
          type={form.encrypted ? 'password' : 'text'}
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
        />
      </div>
      {form.scope === 'task' && (
        <div>
          <label className="text-xs text-text-muted block mb-1">Task ID</label>
          <input
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm font-mono"
            placeholder="Task ID for scoping"
            value={form.scope_id}
            onChange={(e) => setForm({ ...form, scope_id: e.target.value })}
          />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={form.encrypted}
          onChange={(e) => setForm({ ...form, encrypted: e.target.checked })}
          className="accent-accent"
        />
        <Lock className="w-3.5 h-3.5" /> Encrypt value (mask in UI)
      </label>
      <div className="flex gap-2">
        <button onClick={onSave} className="px-4 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/90">
          <Save className="w-3.5 h-3.5 inline mr-1" /> Save
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 bg-bg-tertiary text-text-primary rounded-lg text-sm">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
            <Variable className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Environment Variables</h1>
            <p className="text-sm text-text-muted">Manage variables for task execution contexts</p>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            className="bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All scopes</option>
            <option value="global">Global</option>
            <option value="task">Task</option>
          </select>
          <button
            onClick={() => { setShowCreate(true); setEditing(null); setForm({ name: '', value: '', scope: 'global', scope_id: '', encrypted: false }); }}
            className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
          >
            <Plus className="w-4 h-4" /> Add Variable
          </button>
        </div>
      </div>

      {showCreate && !editing && renderForm(handleCreate, () => setShowCreate(false))}

      {loading ? (
        <p className="text-center text-text-muted py-8">Loading...</p>
      ) : vars.length === 0 && !showCreate ? (
        <div className="text-center py-12 border border-border rounded-xl bg-bg-secondary">
          <Variable className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No environment variables</p>
        </div>
      ) : (
        <div className="space-y-2">
          {vars.map((v) =>
            editing === v.id ? (
              <div key={v.id}>{renderForm(handleUpdate, () => setEditing(null))}</div>
            ) : (
              <div key={v.id} className="flex items-center justify-between border border-border rounded-xl bg-bg-secondary px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  {v.encrypted ? <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" /> : <Variable className="w-4 h-4 text-text-muted flex-shrink-0" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-text-primary">{v.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        v.scope === 'global' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {v.scope}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-text-muted mt-0.5">
                      {revealed[v.id] || v.value}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {v.encrypted && !revealed[v.id] && (
                    <button onClick={() => handleReveal(v.id)} className="p-1.5 text-text-muted hover:text-text-primary rounded hover:bg-bg-tertiary">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {revealed[v.id] && (
                    <button onClick={() => setRevealed({ ...revealed, [v.id]: undefined })} className="p-1.5 text-text-muted hover:text-text-primary rounded hover:bg-bg-tertiary">
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => startEdit(v)} className="p-1.5 text-text-muted hover:text-text-primary rounded hover:bg-bg-tertiary">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="p-1.5 text-text-muted hover:text-red rounded hover:bg-bg-tertiary">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
