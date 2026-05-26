import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Loader2, Circle } from 'lucide-react';

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, color: 'text-accent', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red', label: 'Failed' },
  running: { icon: Loader2, color: 'text-blue', label: 'Running', spin: true },
  paused: { icon: Clock, color: 'text-amber', label: 'Paused' },
  pending: { icon: Circle, color: 'text-text-muted', label: 'Pending' },
  planning: { icon: Loader2, color: 'text-purple', label: 'Planning', spin: true },
};

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

        return (
          <Link
            key={task.id}
            to={`/task/${task.id}`}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-secondary hover:bg-bg-tertiary transition-colors no-underline"
          >
            <Icon className={`w-4 h-4 ${config.color} shrink-0 ${config.spin ? 'animate-spin' : ''}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{task.goal}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs ${config.color}`}>{config.label}</span>
                {task.total_iterations > 0 && (
                  <span className="text-xs text-text-muted">{task.total_iterations} iterations</span>
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
