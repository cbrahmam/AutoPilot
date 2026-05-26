import AgentCard from './AgentCard';
import { useTaskStore } from '../store/taskStore';

export default function Sidebar() {
  const agents = useTaskStore((s) => s.agents);
  const events = useTaskStore((s) => s.events);
  const progress = useTaskStore((s) => s.progress);

  const toolCalls = events.filter((e) => e.type === 'tool_call').length;
  const iterations = events.filter((e) => e.type === 'iteration');
  const lastIteration = iterations[iterations.length - 1];

  return (
    <div className="w-64 border-l border-border bg-bg-secondary p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
        Agents
      </h3>
      {agents.length === 0 ? (
        <p className="text-sm text-text-muted">No agents active</p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent, i) => (
            <AgentCard key={agent.name || i} agent={agent} />
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Progress
        </h3>

        {progress && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-text-secondary mb-1">
              <span>{progress.completed}/{progress.total} subtasks</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>Agents</span>
            <span className="text-text-primary">{agents.length}</span>
          </div>
          {lastIteration && (
            <div className="flex justify-between text-text-secondary">
              <span>Iteration</span>
              <span className="text-text-primary">
                {lastIteration.data.iteration}/{lastIteration.data.max}
              </span>
            </div>
          )}
          <div className="flex justify-between text-text-secondary">
            <span>Tool calls</span>
            <span className="text-text-primary">{toolCalls}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
