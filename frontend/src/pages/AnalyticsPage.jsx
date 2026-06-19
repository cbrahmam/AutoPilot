import { useEffect, useState } from 'react';
import {
  BarChart3, TrendingUp, Loader2, CheckCircle2, XCircle, Cpu, Coins,
  Wrench, Activity, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from 'recharts';
import { api } from '../api/client';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [tasksTime, setTasksTime] = useState([]);
  const [tokensTime, setTokensTime] = useState([]);
  const [agentPerf, setAgentPerf] = useState([]);
  const [toolUsage, setToolUsage] = useState([]);
  const [costData, setCostData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAnalyticsOverview().catch(() => null),
      api.getTasksOverTime().catch(() => []),
      api.getTokensOverTime().catch(() => []),
      api.getAgentPerformance().catch(() => []),
      api.getToolUsage().catch(() => []),
      api.getCostBreakdown().catch(() => []),
    ]).then(([ov, tt, tk, ap, tu, cd]) => {
      setOverview(ov);
      setTasksTime(tt);
      setTokensTime(tk);
      setAgentPerf(ap);
      setToolUsage(tu);
      setCostData(cd);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading analytics...
      </div>
    );
  }

  const statCards = overview ? [
    { icon: Cpu, label: 'Total Tasks', value: overview.total_tasks, color: 'text-blue' },
    { icon: CheckCircle2, label: 'Success Rate', value: `${overview.success_rate}%`, color: 'text-accent' },
    { icon: XCircle, label: 'Failed', value: overview.failed_tasks, color: 'text-red' },
    { icon: Activity, label: 'Avg Iterations', value: overview.avg_iterations_per_task, color: 'text-yellow' },
    { icon: Zap, label: 'Avg Tokens', value: overview.avg_tokens_per_task.toLocaleString(), color: 'text-purple' },
    { icon: Coins, label: 'Total Cost', value: `$${overview.estimated_total_cost.toFixed(2)}`, color: 'text-accent' },
  ] : [];

  const pieData = overview ? [
    { name: 'Completed', value: overview.completed_tasks },
    { name: 'Failed', value: overview.failed_tasks },
    { name: 'Running', value: overview.running_tasks },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold text-text-primary">Analytics Dashboard</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {statCards.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="border border-border rounded-xl bg-bg-secondary p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-lg font-bold text-text-primary">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="border border-border rounded-xl bg-bg-secondary p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Tasks Over Time</h3>
            {tasksTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tasksTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => v?.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-muted text-sm text-center py-16">No task data yet.</p>
            )}
          </div>

          <div className="border border-border rounded-xl bg-bg-secondary p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Token Usage Over Time</h3>
            {tokensTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={tokensTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => v?.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [v.toLocaleString(), 'Tokens']} />
                  <Area type="monotone" dataKey="tokens" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-muted text-sm text-center py-16">No token data yet.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="border border-border rounded-xl bg-bg-secondary p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Cost Trend</h3>
            {costData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={costData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => v?.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`$${v.toFixed(4)}`]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="daily_cost" stroke="#f59e0b" name="Daily" dot={false} />
                  <Line type="monotone" dataKey="cumulative_cost" stroke="#10b981" name="Cumulative" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-muted text-sm text-center py-16">No cost data yet.</p>
            )}
          </div>

          <div className="border border-border rounded-xl bg-bg-secondary p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Task Status Distribution</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-muted text-sm text-center py-16">No data yet.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-border rounded-xl bg-bg-secondary p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Tool Usage</h3>
            {toolUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={toolUsage} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <YAxis dataKey="tool_name" type="category" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} width={100} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="call_count" fill="#3b82f6" name="Calls" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-muted text-sm text-center py-16">No tool data yet.</p>
            )}
          </div>

          <div className="border border-border rounded-xl bg-bg-secondary p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Agent Performance</h3>
            {agentPerf.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {agentPerf.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-bg-primary rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{a.agent_name}</p>
                      <p className="text-xs text-text-muted">{a.task_count} tasks · {a.total_actions} actions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-primary">{(a.total_tokens || 0).toLocaleString()} tokens</p>
                      <p className="text-xs text-text-muted">~{Math.round((a.avg_duration_ms || 0) / 1000)}s avg</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-sm text-center py-16">No agent data yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
