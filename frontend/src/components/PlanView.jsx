import { Search, Code, BarChart3, Pen, Bot, ArrowDown, Play, RefreshCw } from 'lucide-react';

const ROLE_ICONS = {
  researcher: Search,
  coder: Code,
  analyst: BarChart3,
  writer: Pen,
  general: Bot,
};

const COMPLEXITY_COLORS = {
  simple: 'bg-accent/20 text-accent',
  moderate: 'bg-amber/20 text-amber',
  complex: 'bg-red/20 text-red',
};

export default function PlanView({ plan, onExecute, onReplan }) {
  if (!plan) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Execution Plan</h2>
          <p className="text-sm text-text-secondary mt-1">{plan.plan_reasoning}</p>
        </div>
        <div className="flex gap-2">
          {onReplan && (
            <button
              onClick={onReplan}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Re-plan
            </button>
          )}
          {onExecute && (
            <button
              onClick={onExecute}
              className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-accent text-bg-primary text-sm font-medium hover:bg-accent-bright transition-colors"
            >
              <Play className="w-4 h-4" />
              Execute Plan
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-text-secondary">
        <span>{plan.subtasks.length} subtasks</span>
        <span>{plan.execution_order.length} layers</span>
        {plan.estimated_duration && <span>{plan.estimated_duration}</span>}
      </div>

      <div className="space-y-3">
        {plan.execution_order.map((layer, layerIdx) => (
          <div key={layerIdx}>
            {layerIdx > 0 && (
              <div className="flex justify-center py-2">
                <ArrowDown className="w-4 h-4 text-text-muted" />
              </div>
            )}
            <div className="flex gap-3 flex-wrap">
              {layer.map((subtaskId) => {
                const subtask = plan.subtasks.find((s) => s.id === subtaskId);
                if (!subtask) return null;
                const RoleIcon = ROLE_ICONS[subtask.agent_type] || Bot;
                const complexityClass =
                  COMPLEXITY_COLORS[subtask.estimated_complexity] || COMPLEXITY_COLORS.moderate;

                return (
                  <div
                    key={subtaskId}
                    className="flex-1 min-w-[250px] border border-border rounded-lg p-4 bg-bg-secondary"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <RoleIcon className="w-4 h-4 text-blue" />
                      <span className="text-sm font-medium text-text-primary">{subtask.title}</span>
                    </div>
                    <p className="text-xs text-text-secondary mb-3 line-clamp-2">
                      {subtask.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue/20 text-blue">
                        {subtask.agent_type}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${complexityClass}`}>
                        {subtask.estimated_complexity}
                      </span>
                      {subtask.dependencies.length > 0 && (
                        <span className="text-xs text-text-muted">
                          depends on: {subtask.dependencies.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
