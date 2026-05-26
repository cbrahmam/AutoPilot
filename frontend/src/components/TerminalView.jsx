import { useEffect, useRef } from 'react';
import { Terminal as TermIcon } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';

export default function TerminalView() {
  const events = useTaskStore((s) => s.events);
  const bottomRef = useRef(null);

  const terminalEvents = events.filter(
    (e) =>
      (e.type === 'tool_call' &&
        (e.data.tool_name === 'code_execute' || e.data.tool_name === 'shell_command')) ||
      (e.type === 'tool_result' &&
        (e.data.tool_name === 'code_execute' || e.data.tool_name === 'shell_command'))
  );

  const pairs = [];
  const resultMap = {};
  events.forEach((e) => {
    if (e.type === 'tool_result') {
      resultMap[e.data.tool_use_id] = e;
    }
  });
  events.forEach((e) => {
    if (
      e.type === 'tool_call' &&
      (e.data.tool_name === 'code_execute' || e.data.tool_name === 'shell_command')
    ) {
      pairs.push({ call: e, result: resultMap[e.data.tool_use_id] });
    }
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [pairs.length]);

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary border-b border-border">
        <TermIcon className="w-4 h-4 text-accent" />
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Terminal
        </span>
        <span className="text-xs text-text-muted ml-auto">{pairs.length} executions</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-4">
        {pairs.length === 0 ? (
          <p className="text-text-muted">No code executions yet.</p>
        ) : (
          pairs.map((pair, i) => (
            <TerminalEntry key={i} call={pair.call} result={pair.result} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function TerminalEntry({ call, result }) {
  const { tool_name, tool_input } = call.data;

  let command = '';
  if (tool_name === 'code_execute') {
    const lang = tool_input.language || 'python';
    const ext = { python: 'py', javascript: 'js', bash: 'sh' }[lang] || lang;
    command = `${lang === 'bash' ? 'bash' : lang} script.${ext}`;
  } else {
    command = tool_input.command || 'shell command';
  }

  const success = result?.data?.success;
  const output = result?.data?.output || '';
  const error = result?.data?.error;
  const execTime = result?.data?.execution_time_ms;

  const lines = output.split('\n');
  const stdoutLines = [];
  const stderrLines = [];
  let section = 'stdout';
  for (const line of lines) {
    if (line.startsWith('STDERR:')) {
      section = 'stderr';
      continue;
    }
    if (line.startsWith('STDOUT:')) {
      section = 'stdout';
      continue;
    }
    if (line.startsWith('Exit code:')) continue;
    if (section === 'stderr') stderrLines.push(line);
    else stdoutLines.push(line);
  }

  return (
    <div className="border-b border-border/30 pb-3">
      <div className="text-accent mb-1">
        $ {command}
        {execTime != null && (
          <span className="text-text-muted ml-2">({execTime}ms)</span>
        )}
      </div>

      {tool_name === 'code_execute' && tool_input.code && (
        <pre className="text-text-muted mb-2 pl-2 border-l border-border/30 whitespace-pre-wrap">
          {tool_input.code.length > 500
            ? tool_input.code.slice(0, 500) + '\n...'
            : tool_input.code}
        </pre>
      )}

      {stdoutLines.length > 0 && (
        <pre className="text-white whitespace-pre-wrap">{stdoutLines.join('\n')}</pre>
      )}

      {stderrLines.length > 0 && (
        <pre className="text-red whitespace-pre-wrap">{stderrLines.join('\n')}</pre>
      )}

      {error && !stderrLines.length && (
        <pre className="text-red whitespace-pre-wrap">{error}</pre>
      )}

      {result && (
        <div className={`mt-1 text-xs ${success ? 'text-accent' : 'text-red'}`}>
          {success ? '✓ exit 0' : '✗ non-zero exit'}
        </div>
      )}
    </div>
  );
}
