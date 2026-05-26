import { useEffect, useRef } from 'react';
import { useTaskStore } from '../store/taskStore';
import ThoughtBubble from './ThoughtBubble';
import ToolCallCard from './ToolCallCard';
import { ArrowRight, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

export default function ExecutionStream() {
  const events = useTaskStore((s) => s.events);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Waiting for agent activity...
      </div>
    );
  }

  const toolResultMap = {};
  events.forEach((e) => {
    if (e.type === 'tool_result' && e.data.tool_use_id) {
      toolResultMap[e.data.tool_use_id] = e;
    }
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {events.map((event, i) => {
        switch (event.type) {
          case 'thinking':
            return (
              <ThoughtBubble
                key={i}
                text={event.data.text}
                agentName={event.agent_name}
                timestamp={event.timestamp}
              />
            );

          case 'tool_call':
            return (
              <ToolCallCard
                key={i}
                event={event}
                resultEvent={toolResultMap[event.data.tool_use_id]}
              />
            );

          case 'tool_result':
            return null;

          case 'agent_start':
            return (
              <div key={i} className="animate-fade-in flex items-center gap-2 py-2 px-3 text-purple">
                <ArrowRight className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Starting {event.data.agent_type} agent: {event.data.title}
                </span>
              </div>
            );

          case 'agent_complete':
            return (
              <div key={i} className="animate-fade-in flex items-center gap-2 py-2 px-3 text-purple">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">
                  {event.data.agent_name} completed
                  {event.data.duration_ms ? ` (${(event.data.duration_ms / 1000).toFixed(1)}s)` : ''}
                </span>
              </div>
            );

          case 'layer_start':
            return (
              <div key={i} className="animate-fade-in py-2 px-3">
                <span className="text-xs text-text-muted uppercase tracking-wider">
                  Execution layer {event.data.layer}/{event.data.total_layers}
                </span>
              </div>
            );

          case 'complete':
            return (
              <div key={i} className="animate-fade-in flex items-center gap-2 py-3 px-3 text-accent border-t border-border mt-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-semibold">Task completed</span>
              </div>
            );

          case 'error':
            return (
              <div key={i} className="animate-fade-in flex items-center gap-2 py-3 px-3 text-red border-t border-border mt-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-semibold">Error: {event.data.error}</span>
              </div>
            );

          case 'iteration':
          case 'status_change':
          case 'plan_start':
          case 'layer_complete':
          case 'execution_complete':
          case 'memory_save':
            return null;

          default:
            return null;
        }
      })}
      <div ref={bottomRef} />
    </div>
  );
}
