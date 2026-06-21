import { useEffect, useState } from 'react';
import { Tag, Plus, Trash2, Edit3, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b',
];

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', color: '#6366f1', description: '' });
  const [tasks, setTasks] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setTags(await api.getTagCounts()); } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name) return;
    await api.createTag(form);
    setForm({ name: '', color: '#6366f1', description: '' });
    setShowCreate(false);
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await api.updateTag(editing, form);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    await api.deleteTag(id);
    if (selectedTag === id) { setSelectedTag(null); setTasks([]); }
    load();
  };

  const handleSelectTag = async (tag) => {
    setSelectedTag(tag.id);
    try { setTasks(await api.getTasksByTag(tag.id)); } catch {}
  };

  const startEdit = (tag) => {
    setEditing(tag.id);
    setForm({ name: tag.name, color: tag.color, description: tag.description || '' });
    setShowCreate(false);
  };

  const renderForm = (onSave, onCancel) => (
    <div className="border border-border rounded-xl bg-bg-secondary p-4 space-y-3">
      <input
        className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
        placeholder="Tag name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <div>
        <label className="text-xs text-text-muted block mb-1.5">Color</label>
        <div className="flex gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setForm({ ...form, color: c })}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                form.color === c ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="px-4 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/90">
          <Save className="w-3.5 h-3.5 inline mr-1" /> Save
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 bg-bg-tertiary text-text-primary rounded-lg text-sm">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
            <Tag className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Tags & Labels</h1>
            <p className="text-sm text-text-muted">Organize tasks with color-coded tags</p>
          </div>
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditing(null); setForm({ name: '', color: '#6366f1', description: '' }); }}
          className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
        >
          <Plus className="w-4 h-4" /> New Tag
        </button>
      </div>

      {showCreate && !editing && renderForm(handleCreate, () => setShowCreate(false))}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs text-text-muted font-medium px-1">All Tags</p>
          {loading ? (
            <p className="text-sm text-text-muted text-center py-4">Loading...</p>
          ) : tags.length === 0 ? (
            <div className="text-center py-8 border border-border rounded-xl bg-bg-secondary">
              <Tag className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">No tags yet</p>
            </div>
          ) : (
            tags.map((tag) =>
              editing === tag.id ? (
                <div key={tag.id}>{renderForm(handleUpdate, () => setEditing(null))}</div>
              ) : (
                <div
                  key={tag.id}
                  onClick={() => handleSelectTag(tag)}
                  className={`flex items-center justify-between border rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${
                    selectedTag === tag.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border bg-bg-secondary hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                    <div>
                      <p className="text-sm text-text-primary">{tag.name}</p>
                      <p className="text-[11px] text-text-muted">{tag.task_count} tasks</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(tag); }} className="p-1 text-text-muted hover:text-text-primary">
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(tag.id); }} className="p-1 text-text-muted hover:text-red">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            )
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedTag ? (
            <div className="space-y-2">
              <p className="text-xs text-text-muted font-medium px-1">
                Tasks with tag "{tags.find((t) => t.id === selectedTag)?.name}"
              </p>
              {tasks.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8 border border-border rounded-xl bg-bg-secondary">
                  No tasks with this tag
                </p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/task/${task.id}`)}
                    className="border border-border rounded-xl bg-bg-secondary px-4 py-3 cursor-pointer hover:border-border/80 transition-colors"
                  >
                    <p className="text-sm text-text-primary truncate">{task.goal}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-text-muted capitalize">{task.status}</span>
                      <span className="text-[11px] text-text-muted">
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-12 border border-border rounded-xl bg-bg-secondary">
              <Tag className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">Select a tag to view its tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
