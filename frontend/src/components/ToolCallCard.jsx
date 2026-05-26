import { useState } from 'react';
import {
  Search, Globe, Terminal, FileText, BarChart3, MessageSquare, HardDrive, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock,
} from 'lucide-react';

const TOOL_ICONS = {
  web_search: Search,
  web_browse: Globe,
  code_execute: Terminal,
  file_ops: FileText,
  data_analyze: BarChart3,
  shell_command: HardDrive,
  ask_human: MessageSquare,
  save_to_memory: FileText,
};

export default function ToolCallCard({ event, resultEvent }) {
  const [expanded, setExpanded] = useState(false);
  const { tool_name, tool_input } = event.data;
  const Icon = TOOL_ICONS[tool_name] || Terminal;

  const hasResult = !!resultEvent;
  const success = resultEvent?.data?.success;
  const resultOutput = resultEvent?.data?.output || '';
  const resultError = resultEvent?.data?.error;
  const execTime = resultEvent?.data?.execution_time_ms;

  return (
    <div className="animate-fade-in border border-border rounded-lg overflow-hidden my-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2 bg-bg-secondary hover:bg-bg-tertiary transition-colors text-left"
      >
        <Icon className="w-4 h-4 text-blue shrink-0" />
        <span className="text-sm font-mono text-blue flex-1 truncate">{tool_name}</span>
        {hasResult && (
          success ? (
            <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red shrink-0" />
          )
        )}
        {execTime != null && (
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {execTime}ms
          </span>
        )}
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border">
          <div className="px-3 py-2 bg-bg-primary">
            <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">Input</p>
            <pre className="text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre-wrap">
              {formatInput(tool_name, tool_input)}
            </pre>
          </div>
          {hasResult && (
            <div className="px-3 py-2 bg-bg-primary border-t border-border">
              <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">
                {success ? 'Output' : 'Error'}
              </p>
              <pre className={`text-xs font-mono overflow-x-auto whitespace-pre-wrap ${
                success ? 'text-text-secondary' : 'text-red'
              }`}>
                {resultError || resultOutput || '(empty)'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatInput(toolName, input) {
  if (!input) return '{}';
  if (toolName === 'code_execute') {
    return `[${input.language}]\n${input.code}`;
  }
  if (toolName === 'web_search') {
    return input.query;
  }
  if (toolName === 'web_browse') {
    return `${input.url} (extract: ${input.extract || 'text'})`;
  }
  if (toolName === 'file_ops') {
    return `${input.operation} ${input.path}${input.content ? `\n---\n${input.content.slice(0, 200)}` : ''}`;
  }
  return JSON.stringify(input, null, 2);
}
