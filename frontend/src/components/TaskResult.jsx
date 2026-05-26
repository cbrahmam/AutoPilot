import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  CheckCircle2, XCircle, Clock, Cpu, Wrench, Coins, FileText, Send, RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';

export default function TaskResult({ task, events }) {
  const navigate = useNavigate();
  const [followUp, setFollowUp] = useState('');
  const [loading, setLoading] = useState(false);

  if (!task) return null;

  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';

  const agentStarts = events.filter((e) => e.type === 'agent_start');
  const agentCompletes = events.filter((e) => e.type === 'agent_complete');
  const toolCalls = events.filter((e) => e.type === 'tool_call');

  const toolBreakdown = {};
  toolCalls.forEach((e) => {
    const name = e.data.tool_name || 'unknown';
    toolBreakdown[name] = (toolBreakdown[name] || 0) + 1;
  });

  const totalTime = task.completed_at && task.created_at
    ? Math.round((new Date(task.completed_at) - new Date(task.created_at)) / 1000)
    : null;

  const estimatedCost = task.total_tokens
    ? ((task.total_tokens / 1_000_000) * 9).toFixed(4)
    : null;

  const handleFollowUp = async () => {
    if (!followUp.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: followUp.trim() }),
      });
      const data = await res.json();
      if (data.id) {
        await api.executeTask(data.id);
        navigate(`/task/${data.id}`);
      }
    } catch {}
    setLoading(false);
  };

  const handleRerun = async () => {
    setLoading(true);
    try {
      const newTask = await api.createTask(task.goal);
      await api.executeTask(newTask.id);
      navigate(`/task/${newTask.id}`);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Status header */}
      <div className="flex items-center gap-3">
        {isCompleted ? (
          <CheckCircle2 className="w-6 h-6 text-accent" />
        ) : (
          <XCircle className="w-6 h-6 text-red" />
        )}
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {isCompleted ? 'Task Completed' : 'Task Failed'}
          </h2>
          <p className="text-sm text-text-secondary truncate max-w-lg">{task.goal}</p>
        </div>
      </div>

      {/* Result content */}
      {task.result && (
        <div className="border border-border rounded-lg p-4 bg-bg-secondary">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Result</h3>
          <div className="prose prose-invert prose-sm max-w-none text-text-secondary">
            <ReactMarkdown>{task.result}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {totalTime != null && (
          <StatCard icon={Clock} label="Duration" value={formatDuration(totalTime)} />
        )}
        <StatCard icon={Cpu} label="Agents" value={agentStarts.length || 1} />
        <StatCard icon={Wrench} label="Iterations" value={task.total_iterations} />
        <StatCard icon={Wrench} label="Tool calls" value={task.total_tool_calls || toolCalls.length} />
        {task.total_tokens > 0 && (
          <StatCard icon={FileText} label="Tokens" value={task.total_tokens.toLocaleString()} />
        )}
        {estimatedCost && (
          <StatCard icon={Coins} label="Est. cost" value={`$${estimatedCost}`} />
        )}
      </div>

      {/* Tool breakdown */}
      {Object.keys(toolBreakdown).length > 0 && (
        <div className="border border-border rounded-lg p-4 bg-bg-secondary">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Tool Usage</h3>
          <div className="space-y-2">
            {Object.entries(toolBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => {
                const maxCount = Math.max(...Object.values(toolBreakdown));
                const pct = (count / maxCount) * 100;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary w-28 font-mono truncate">{name}</span>
                    <div className="flex-1 h-4 bg-bg-tertiary rounded overflow-hidden">
                      <div
                        className="h-full bg-blue/40 rounded"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted w-8 text-right">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Agent timeline */}
      {agentCompletes.length > 0 && (
        <div className="border border-border rounded-lg p-4 bg-bg-secondary">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Agent Timeline</h3>
          <div className="space-y-2">
            {agentCompletes.map((e, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-text-secondary w-32 font-mono truncate">
                  {e.data.agent_name}
                </span>
                <div className="flex-1 h-5 bg-bg-tertiary rounded overflow-hidden relative">
                  <div
                    className={`h-full rounded ${
                      e.data.status === 'completed' ? 'bg-accent/30' : 'bg-red/30'
                    }`}
                    style={{ width: '100%' }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-text-secondary">
                    {e.data.duration_ms ? `${(e.data.duration_ms / 1000).toFixed(1)}s` : ''}
                  </span>
                </div>
                {e.data.status === 'completed' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleRerun}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Re-run
        </button>
      </div>

      {/* Follow-up */}
      <div className="border border-border rounded-lg p-4 bg-bg-secondary">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Run Follow-up</h3>
        <p className="text-xs text-text-muted mb-3">
          Continue working with the same files and context from this task.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            placeholder="What should the agent do next?"
            className="flex-1 bg-bg-primary border border-border rounded-md px-3 py-1.5 text-sm text-text-primary placeholder-text-muted outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleFollowUp()}
          />
          <button
            onClick={handleFollowUp}
            disabled={!followUp.trim() || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-bg-primary text-sm font-medium hover:bg-accent-bright transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-bg-secondary">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec}s`;
}
