import { useEffect, useState } from 'react';
import {
  HeartPulse, RefreshCw, Database, Cpu, HardDrive, Brain, Server, CheckCircle2, AlertCircle, AlertTriangle, Clock,
} from 'lucide-react';
import { api } from '../api/client';

const STATUS_STYLES = {
  healthy: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
  configured: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
  degraded: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  unhealthy: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  critical: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  unconfigured: { icon: AlertTriangle, color: 'text-text-muted', bg: 'bg-bg-tertiary' },
  unknown: { icon: Clock, color: 'text-text-muted', bg: 'bg-bg-tertiary' },
};

const SERVICE_ICONS = {
  database: Database,
  anthropic_api: Brain,
  disk: HardDrive,
  memory: Cpu,
};

export default function HealthPage() {
  const [health, setHealth] = useState(null);
  const [uptime, setUptime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [h, u] = await Promise.all([api.getHealthCheck(), api.getUptime()]);
      setHealth(h);
      setUptime(u);
    } catch {}
    setLoading(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <p className="text-center text-text-muted py-12">Running health checks...</p>;
  if (!health) return <p className="text-center text-text-muted py-12">Failed to load health data</p>;

  const overallStyle = STATUS_STYLES[health.overall] || STATUS_STYLES.unknown;
  const OverallIcon = overallStyle.icon;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${overallStyle.bg} rounded-xl flex items-center justify-center`}>
            <HeartPulse className={`w-5 h-5 ${overallStyle.color}`} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">System Health</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <OverallIcon className={`w-3.5 h-3.5 ${overallStyle.color}`} />
              <span className={`text-sm font-medium capitalize ${overallStyle.color}`}>{health.overall}</span>
              <span className="text-xs text-text-muted">
                Last checked: {new Date(health.checked_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Service Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {health.checks.map((check) => {
          const style = STATUS_STYLES[check.status] || STATUS_STYLES.unknown;
          const StatusIcon = style.icon;
          const ServiceIcon = SERVICE_ICONS[check.service] || Server;
          return (
            <div key={check.service} className="border border-border rounded-xl bg-bg-secondary p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ServiceIcon className="w-4 h-4 text-text-muted" />
                  <span className="text-sm font-medium text-text-primary capitalize">
                    {check.service.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusIcon className={`w-4 h-4 ${style.color}`} />
                  <span className={`text-xs font-medium capitalize ${style.color}`}>{check.status}</span>
                </div>
              </div>
              <p className="text-xs text-text-muted">{check.details}</p>
              {check.response_time_ms > 0 && (
                <p className="text-[11px] text-text-muted mt-1">Response: {check.response_time_ms}ms</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Uptime Stats */}
      {uptime && Object.keys(uptime).length > 0 && (
        <div className="border border-border rounded-xl bg-bg-secondary p-5">
          <h3 className="text-sm font-medium text-text-primary mb-3">Uptime</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(uptime).map(([service, data]) => (
              <div key={service} className="text-center">
                <p className="text-2xl font-bold text-accent">{data.uptime_pct}%</p>
                <p className="text-xs text-text-muted capitalize mt-1">{service.replace('_', ' ')}</p>
                <p className="text-[10px] text-text-muted">{data.total} checks</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Info */}
      {health.system && (
        <div className="border border-border rounded-xl bg-bg-secondary p-5">
          <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <Server className="w-4 h-4 text-text-muted" /> System Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(health.system).map(([key, value]) => (
              <div key={key}>
                <p className="text-[11px] text-text-muted capitalize">{key.replace('_', ' ')}</p>
                <p className="text-xs text-text-primary font-mono">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Database Stats */}
      {health.database && (
        <div className="border border-border rounded-xl bg-bg-secondary p-5">
          <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-text-muted" /> Database
            <span className="text-xs text-text-muted font-normal ml-auto">
              Size: {health.database.database_size_mb}MB
            </span>
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {Object.entries(health.database.tables || {}).map(([table, count]) => (
              <div key={table} className="bg-bg-primary rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-accent">{count >= 0 ? count : '?'}</p>
                <p className="text-[10px] text-text-muted truncate">{table}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
