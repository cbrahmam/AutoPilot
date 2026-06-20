import { useEffect, useState } from 'react';
import {
  Bot, Plus, Trash2, Copy, Edit3, Save, X, Cpu, Wrench, Thermometer, RotateCw,
} from 'lucide-react';
import { api } from '../api/client';

const AVAILABLE_TOOLS = [
  'web_search', 'web_browse', 'code_execute', 'file_read', 'file_write',
  'file_list', 'file_delete', 'shell_command', 'data_analyze', 'knowledge_search',
];

const MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  { value: 'claude-haiku-4-20250514', label: 'Claude Haiku 4' },
];

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', system_prompt: '', model: 'claude-sonnet-4-20250514',
    tools: [], max_iterations: 25, temperature: 0.7,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setProfiles(await api.getProfiles()); } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name) return;
    await api.createProfile(form);
    setForm({ name: '', description: '', system_prompt: '', model: 'claude-sonnet-4-20250514', tools: [], max_iterations: 25, temperature: 0.7 });
    setShowCreate(false);
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await api.updateProfile(editing, form);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    await api.deleteProfile(id);
    load();
  };

  const handleDuplicate = async (id) => {
    await api.duplicateProfile(id);
    load();
  };

  const startEdit = (p) => {
    setEditing(p.id);
    setForm({
      name: p.name, description: p.description || '', system_prompt: p.system_prompt || '',
      model: p.model, tools: p.tools || [], max_iterations: p.max_iterations, temperature: p.temperature,
    });
    setShowCreate(false);
  };

  const toggleTool = (tool) => {
    setForm((f) => ({
      ...f,
      tools: f.tools.includes(tool) ? f.tools.filter((t) => t !== tool) : [...f.tools, tool],
    }));
  };

  const renderForm = (onSave, onCancel) => (
    <div className="border border-border rounded-xl bg-bg-secondary p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-text-muted block mb-1">Name</label>
          <input
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
            placeholder="Agent profile name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1">Model</label>
          <select
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          >
            {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-1">Description</label>
        <input
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
          placeholder="What this agent specializes in"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-1">System Prompt</label>
        <textarea
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm h-24 resize-none"
          placeholder="Custom instructions for this agent..."
          value={form.system_prompt}
          onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-text-muted block mb-1">Max Iterations</label>
          <input
            type="number"
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
            value={form.max_iterations}
            onChange={(e) => setForm({ ...form, max_iterations: parseInt(e.target.value) || 25 })}
            min={1}
            max={100}
          />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1 flex items-center gap-1">
            <Thermometer className="w-3 h-3" /> Temperature: {form.temperature}
          </label>
          <input
            type="range"
            className="w-full accent-accent"
            min="0"
            max="1"
            step="0.1"
            value={form.temperature}
            onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-2">Tools</label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TOOLS.map((tool) => (
            <button
              key={tool}
              onClick={() => toggleTool(tool)}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                form.tools.includes(tool)
                  ? 'bg-accent/20 border-accent/40 text-accent'
                  : 'bg-bg-primary border-border text-text-muted hover:text-text-secondary'
              }`}
            >
              <Wrench className="w-3 h-3 inline mr-1" />
              {tool}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onSave} className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90">
          <Save className="w-4 h-4 inline mr-1" /> Save
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-bg-tertiary text-text-primary rounded-lg text-sm hover:bg-border">
          <X className="w-4 h-4 inline mr-1" /> Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Agent Profiles</h1>
            <p className="text-sm text-text-muted">Configure custom agent behaviors and capabilities</p>
          </div>
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditing(null); setForm({ name: '', description: '', system_prompt: '', model: 'claude-sonnet-4-20250514', tools: [], max_iterations: 25, temperature: 0.7 }); }}
          className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
        >
          <Plus className="w-4 h-4" /> New Profile
        </button>
      </div>

      {showCreate && !editing && renderForm(handleCreate, () => setShowCreate(false))}

      {loading ? (
        <p className="text-center text-text-muted py-8">Loading profiles...</p>
      ) : profiles.length === 0 && !showCreate ? (
        <div className="text-center py-12 border border-border rounded-xl bg-bg-secondary">
          <Bot className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No agent profiles yet</p>
          <p className="text-text-muted text-xs mt-1">Create one to customize agent behavior</p>
        </div>
      ) : (
        <div className="space-y-4">
          {profiles.map((p) =>
            editing === p.id ? (
              <div key={p.id}>{renderForm(handleUpdate, () => setEditing(null))}</div>
            ) : (
              <div key={p.id} className="border border-border rounded-xl bg-bg-secondary p-4 hover:border-border/80 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-bg-tertiary rounded-lg flex items-center justify-center mt-0.5">
                      <Cpu className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">{p.name}</h3>
                      {p.description && <p className="text-xs text-text-muted mt-0.5">{p.description}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[11px] bg-bg-tertiary px-2 py-0.5 rounded text-text-secondary">
                          {MODELS.find((m) => m.value === p.model)?.label || p.model}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {(p.tools || []).length} tools
                        </span>
                        <span className="text-[11px] text-text-muted">
                          max {p.max_iterations} iters
                        </span>
                        <span className="text-[11px] text-text-muted">
                          temp {p.temperature}
                        </span>
                      </div>
                      {(p.tools || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.tools.map((t) => (
                            <span key={t} className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(p)} className="p-1.5 text-text-muted hover:text-text-primary rounded hover:bg-bg-tertiary">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDuplicate(p.id)} className="p-1.5 text-text-muted hover:text-text-primary rounded hover:bg-bg-tertiary">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 text-text-muted hover:text-red rounded hover:bg-bg-tertiary">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
