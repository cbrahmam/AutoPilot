import { Bot, Search, Code, BarChart3, Pen } from 'lucide-react';

const ROLE_CONFIG = {
  researcher: { icon: Search, color: 'text-blue', bg: 'bg-blue/10' },
  coder: { icon: Code, color: 'text-accent', bg: 'bg-accent/10' },
  analyst: { icon: BarChart3, color: 'text-purple', bg: 'bg-purple/10' },
  writer: { icon: Pen, color: 'text-amber', bg: 'bg-amber/10' },
  general: { icon: Bot, color: 'text-text-secondary', bg: 'bg-bg-tertiary' },
};

const STATUS_DOT = {
  idle: 'bg-text-muted',
  thinking: 'bg-blue animate-pulse-green',
  acting: 'bg-accent animate-pulse-green',
  waiting_approval: 'bg-amber animate-pulse-green',
  completed: 'bg-accent',
  failed: 'bg-red',
};

export default function AgentCard({ agent }) {
  const role = agent.role || 'general';
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.general;
  const Icon = config.icon;
  const dotClass = STATUS_DOT[agent.status] || STATUS_DOT.idle;

  return (
    <div className={`p-3 rounded-lg border border-border ${
      agent.status === 'thinking' || agent.status === 'acting'
        ? 'bg-bg-tertiary border-border'
        : 'bg-bg-secondary'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${dotClass}`} />
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className="text-sm font-medium text-text-primary truncate">
          {agent.title || agent.name}
        </span>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <span className={`text-xs px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
          {role}
        </span>
        <span className="text-xs text-text-muted capitalize">{agent.status}</span>
      </div>
    </div>
  );
}
