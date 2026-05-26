import { Brain } from 'lucide-react';

export default function ThoughtBubble({ text, agentName, timestamp }) {
  return (
    <div className="animate-fade-in flex gap-3 py-2 px-3">
      <Brain className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
      <div className="min-w-0">
        {agentName && (
          <span className="text-xs text-text-muted mr-2">{agentName}</span>
        )}
        <p className="text-sm text-text-muted italic leading-relaxed whitespace-pre-wrap">
          {text}
        </p>
      </div>
    </div>
  );
}
