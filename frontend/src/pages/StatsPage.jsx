import { useEffect, useState } from 'react';
import {
  BarChart3, Cpu, Coins, FileText, Wrench, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { api } from '../api/client';

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading stats...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        Unable to load statistics.
      </div>
    );
  }

  const cards = [
    { icon: Cpu, label: 'Total Tasks', value: stats.total_tasks, color: 'text-blue' },
    { icon: CheckCircle2, label: 'Completed', value: stats.completed_tasks, color: 'text-accent' },
    { icon: XCircle, label: 'Failed', value: stats.failed_tasks, color: 'text-red' },
    { icon: Loader2, label: 'Running', value: stats.running_tasks, color: 'text-yellow' },
    { icon: FileText, label: 'Total Tokens', value: stats.total_tokens.toLocaleString(), color: 'text-purple' },
    { icon: Wrench, label: 'Tool Calls', value: stats.total_tool_calls.toLocaleString(), color: 'text-blue' },
    { icon: BarChart3, label: 'Iterations', value: stats.total_iterations.toLocaleString(), color: 'text-text-secondary' },
    { icon: Coins, label: 'Est. Total Cost', value: `$${stats.estimated_total_cost.toFixed(4)}`, color: 'text-accent' },
  ];

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold text-text-primary">Usage Statistics</h1>
        </div>
        <p className="text-text-secondary mb-8">
          Cumulative usage across all tasks.
          Cost estimate based on ${stats.cost_per_million_tokens}/M tokens (blended rate).
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="border border-border rounded-xl bg-bg-secondary p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-text-muted">{label}</span>
              </div>
              <p className="text-xl font-bold text-text-primary">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
