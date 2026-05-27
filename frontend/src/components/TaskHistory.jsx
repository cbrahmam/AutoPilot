import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Loader2, Circle, Coins } from 'lucide-react';

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, color: 'text-accent', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red', label: 'Failed' },
  running: { icon: Loader2, color: 'text-blue', label: 'Running', spin: true },
  paused: { icon: Clock, color: 'text-amber', label: 'Paused' },
  pending: { icon: Circle, color: 'text-text-muted', label: 'Pending' },
  planning: { icon: Loader2, color: 'text-purple', label: 'Planning', spin: true },
};

function formatDuration(created, completed) {
  if (!created || !completed) return null;
  const sec = Math.round((new Date(completed) - new Date(created)) / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

export default function TaskHistory({ tasks }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <p className="text-lg mb-2">No tasks yet</p>
        <p className="text-sm">Create a new task to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
        const Icon = config.icon;
        const created = task.created_at ? new Date(task.created_at).toLocaleDateString() : '';
        const duration = formatDuration(task.created_at, task.completed_at);
        const cost = task.total_tokens ? `$${((task.total_tokens / 1_000_000) * 9).toFixed(4)}` : null;

        return (
          <Link
            key={task.id}
            to={`/task/${task.id}`}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-secondary hover:bg-bg-tertiary transition-colors no-underline"
          >
            <Icon className={`w-4 h-4 ${config.color} shrink-0 ${config.spin ? 'animate-spin' : ''}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{task.goal}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className={`text-xs ${config.color}`}>{config.label}</span>
                {duration && <span className="text-xs text-text-muted">{duration}</span>}
                {task.total_iterations > 0 && (
                  <span className="text-xs text-text-muted">{task.total_iterations} iter</span>
                )}
                {task.total_tool_calls > 0 && (
                  <span className="text-xs text-text-muted">{task.total_tool_calls} tools</span>
                )}
                {cost && (
                  <span className="text-xs text-text-muted flex items-center gap-0.5">
                    <Coins className="w-3 h-3" />{cost}
                  </span>
                )}
                {created && <span className="text-xs text-text-muted">{created}</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
