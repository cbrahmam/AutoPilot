import { useEffect, useState } from 'react';
import {
  GitBranch, Plus, Trash2, Play, Loader2, ChevronDown, ChevronRight,
  ArrowRight, CheckCircle2, XCircle, Clock, SkipForward, GripVertical,
} from 'lucide-react';
import { api } from '../api/client';

const STATUS_ICON = {
  completed: <CheckCircle2 className="w-4 h-4 text-accent" />,
  failed: <XCircle className="w-4 h-4 text-red" />,
  skipped: <SkipForward className="w-4 h-4 text-text-muted" />,
  running: <Loader2 className="w-4 h-4 text-yellow animate-spin" />,
};

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedRuns, setExpandedRuns] = useState(null);
  const [runs, setRuns] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', steps: [{ goal: '', type: 'sequential', condition: '', max_iterations: 25 }] });

  useEffect(() => { loadPipelines(); }, []);

  const loadPipelines = async () => {
    setLoading(true);
    try {
      const data = await api.getPipelines();
      setPipelines(data);
    } catch {}
    setLoading(false);
  };

  const addStep = () => {
    setForm({ ...form, steps: [...form.steps, { goal: '', type: 'sequential', condition: '', max_iterations: 25 }] });
  };

  const removeStep = (index) => {
    setForm({ ...form, steps: form.steps.filter((_, i) => i !== index) });
  };

  const updateStep = (index, field, value) => {
    const steps = [...form.steps];
    steps[index] = { ...steps[index], [field]: value };
    setForm({ ...form, steps });
  };

  const handleCreate = async () => {
    if (!form.name || form.steps.every(s => !s.goal)) return;
    const validSteps = form.steps.filter(s => s.goal.trim());
    await api.createPipeline({ ...form, steps: validSteps });
    setForm({ name: '', description: '', steps: [{ goal: '', type: 'sequential', condition: '', max_iterations: 25 }] });
    setShowCreate(false);
    loadPipelines();
  };

  const handleDelete = async (id) => {
    await api.deletePipeline(id);
    loadPipelines();
  };

  const handleRun = async (id) => {
    await api.runPipeline(id);
    loadPipelines();
  };

  const toggleRuns = async (id) => {
    if (expandedRuns === id) {
      setExpandedRuns(null);
      return;
    }
    setExpandedRuns(id);
    try {
      const data = await api.getPipelineRuns(id);
      setRuns(data);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold text-text-primary">Task Pipelines</h1>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
          >
            <Plus className="w-4 h-4" /> New Pipeline
          </button>
        </div>

        <p className="text-text-secondary text-sm mb-6">
          Chain multiple tasks together into automated pipelines. Output from each step feeds into the next.
        </p>

        {showCreate && (
          <div className="border border-border rounded-xl bg-bg-secondary p-4 mb-6 space-y-4">
            <input
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
              placeholder="Pipeline name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <div className="space-y-3">
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Steps</p>
              {form.steps.map((step, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex flex-col items-center mt-2">
                    <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    {i < form.steps.length - 1 && <div className="w-px h-6 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 bg-bg-primary rounded-lg p-3 border border-border space-y-2">
                    <textarea
                      className="w-full bg-transparent text-text-primary text-sm resize-none"
                      rows={2}
                      placeholder={`Step ${i + 1} goal — use {{previous_output}} to reference the previous step's result`}
                      value={step.goal}
                      onChange={(e) => updateStep(i, 'goal', e.target.value)}
                    />
                    <div className="flex gap-2">
                      <select
                        className="bg-bg-secondary border border-border rounded px-2 py-1 text-text-primary text-xs"
                        value={step.condition}
                        onChange={(e) => updateStep(i, 'condition', e.target.value)}
                      >
                        <option value="">Always run</option>
                        <option value="previous_success">Only if previous succeeded</option>
                        <option value="previous_failed">Only if previous failed</option>
                      </select>
                    </div>
                  </div>
                  {form.steps.length > 1 && (
                    <button onClick={() => removeStep(i)} className="text-text-muted hover:text-red mt-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addStep} className="text-accent text-sm hover:text-accent/80 flex items-center gap-1 ml-8">
                <Plus className="w-3 h-3" /> Add Step
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={handleCreate} className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90">
                Create Pipeline
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {pipelines.length === 0 ? (
          <p className="text-text-muted text-center py-12">No pipelines created yet.</p>
        ) : (
          <div className="space-y-3">
            {pipelines.map((pipeline) => (
              <div key={pipeline.id} className="border border-border rounded-xl bg-bg-secondary p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-4 h-4 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{pipeline.name}</p>
                      <p className="text-xs text-text-muted">
                        {pipeline.steps?.length || 0} steps · {pipeline.run_count || 0} runs
                        {pipeline.status === 'running' && <span className="text-yellow ml-2">Running...</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleRun(pipeline.id)} disabled={pipeline.status === 'running'} className="text-accent hover:text-accent/80 disabled:opacity-50">
                      {pipeline.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={() => toggleRuns(pipeline.id)} className="text-text-muted hover:text-text-primary">
                      {expandedRuns === pipeline.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(pipeline.id)} className="text-text-muted hover:text-red">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {pipeline.description && (
                  <p className="text-xs text-text-muted mt-1 ml-7">{pipeline.description}</p>
                )}

                <div className="flex items-center gap-1 mt-3 ml-7 flex-wrap">
                  {pipeline.steps?.map((step, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-xs bg-bg-primary rounded px-2 py-0.5 text-text-secondary truncate max-w-[150px]">
                        {step.goal?.slice(0, 30) || `Step ${i + 1}`}
                      </span>
                      {i < pipeline.steps.length - 1 && <ArrowRight className="w-3 h-3 text-text-muted" />}
                    </div>
                  ))}
                </div>

                {expandedRuns === pipeline.id && (
                  <div className="mt-4 ml-7 space-y-2">
                    <p className="text-xs text-text-muted font-medium">Recent Runs</p>
                    {runs.length === 0 ? (
                      <p className="text-xs text-text-muted">No runs yet.</p>
                    ) : (
                      runs.map((run) => (
                        <div key={run.id} className="bg-bg-primary rounded-lg p-3 border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-text-primary">
                              {STATUS_ICON[run.status] || <Clock className="w-4 h-4 text-text-muted" />}
                              <span className="ml-2">{run.status}</span>
                            </span>
                            <span className="text-xs text-text-muted">{run.started_at?.slice(0, 19)}</span>
                          </div>
                          <div className="space-y-1">
                            {(run.step_results || []).map((sr, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                {STATUS_ICON[sr.status] || <Clock className="w-3 h-3 text-text-muted" />}
                                <span className="text-text-secondary truncate">{sr.goal?.slice(0, 60)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
