import { useState, useEffect } from 'react';
import { Send, Sparkles, Settings, Search, Code, BarChart3, Pen } from 'lucide-react';

const PLACEHOLDERS = [
  'Research the top 5 CRM tools for startups and create a comparison report',
  'Build a Python script that scrapes Hacker News and saves top stories to CSV',
  'Analyze this sales data and create a summary with charts',
  'Write a technical blog post about RAG pipelines',
];

const TEMPLATES = [
  { icon: Search, label: 'Research & Report', prompt: 'Research [topic] and create a detailed comparison report with key findings' },
  { icon: Code, label: 'Build a Script', prompt: 'Write a Python script that [description] and test it to make sure it works' },
  { icon: BarChart3, label: 'Analyze Data', prompt: 'Analyze the uploaded data file and create a summary report with key insights' },
  { icon: Pen, label: 'Write Content', prompt: 'Write a well-structured [article/blog post/report] about [topic]' },
];

export default function TaskInput({ onSubmit, onPlan, loading }) {
  const [goal, setGoal] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [maxIterations, setMaxIterations] = useState(25);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (mode) => {
    if (!goal.trim() || loading) return;
    if (mode === 'plan') {
      onPlan(goal.trim(), requireApproval, maxIterations);
    } else {
      onSubmit(goal.trim(), requireApproval, maxIterations);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          What do you want me to do?
        </h1>
        <p className="text-text-secondary">
          Describe a task and AutoPilot will plan, assign agents, and deliver results.
        </p>
      </div>

      <div className="border border-border rounded-xl bg-bg-secondary overflow-hidden">
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={PLACEHOLDERS[placeholderIdx]}
          rows={4}
          className="w-full bg-transparent text-text-primary placeholder-text-muted px-4 py-3 resize-none outline-none text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) handleSubmit('execute');
          }}
        />
        <div className="flex items-center justify-between px-4 py-2 border-t border-border">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit('plan')}
              disabled={!goal.trim() || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Plan
            </button>
            <button
              onClick={() => handleSubmit('execute')}
              disabled={!goal.trim() || loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-accent text-bg-primary text-sm font-medium hover:bg-accent-bright transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Run
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="px-4 py-3 border-t border-border space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Require approval for tool calls</span>
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="accent-accent"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Max iterations per agent: {maxIterations}
              </span>
              <input
                type="range"
                min={5}
                max={50}
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                className="w-32 accent-accent"
              />
            </label>
          </div>
        )}
      </div>

      <div className="mt-6">
        <p className="text-xs text-text-muted mb-3 uppercase tracking-wider">Quick templates</p>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map(({ icon: Icon, label, prompt }) => (
            <button
              key={label}
              onClick={() => setGoal(prompt)}
              className="flex items-center gap-2 p-3 rounded-lg border border-border bg-bg-secondary text-left text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              <Icon className="w-4 h-4 text-blue shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
