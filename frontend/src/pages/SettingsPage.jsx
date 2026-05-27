import { useState } from 'react';
import { Settings, Trash2, Save } from 'lucide-react';
import { toast } from '../components/Toast';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('ap_api_key') || '');
  const [model, setModel] = useState(localStorage.getItem('ap_model') || 'claude-sonnet-4-20250514');
  const [maxIterations, setMaxIterations] = useState(Number(localStorage.getItem('ap_max_iter')) || 25);
  const [approvalMode, setApprovalMode] = useState(localStorage.getItem('ap_approval') || 'auto');

  const handleSave = () => {
    localStorage.setItem('ap_api_key', apiKey);
    localStorage.setItem('ap_model', model);
    localStorage.setItem('ap_max_iter', String(maxIterations));
    localStorage.setItem('ap_approval', approvalMode);
    toast('Settings saved', 'success');
  };

  const handleClearHistory = async () => {
    if (!confirm('Delete all task history? This cannot be undone.')) return;
    try {
      await fetch('/api/tasks', { method: 'DELETE' });
      toast('History cleared', 'success');
    } catch {
      toast('Failed to clear history', 'error');
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        </div>

        <div className="space-y-6">
          <Section title="API Configuration">
            <Field label="Anthropic API Key">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
              />
              <p className="text-xs text-text-muted mt-1">
                Stored locally in your browser. Used only for display — backend uses its own .env key.
              </p>
            </Field>
            <Field label="Default Model">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-secondary outline-none focus:border-accent"
              >
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (recommended)</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (faster, cheaper)</option>
              </select>
            </Field>
          </Section>

          <Section title="Execution Defaults">
            <Field label={`Max iterations per agent: ${maxIterations}`}>
              <input
                type="range"
                min={5}
                max={50}
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </Field>
            <Field label="Approval mode">
              <select
                value={approvalMode}
                onChange={(e) => setApprovalMode(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-secondary outline-none focus:border-accent"
              >
                <option value="auto">Automatic (no approval needed)</option>
                <option value="manual">Manual (approve each tool call)</option>
              </select>
            </Field>
          </Section>

          <Section title="Data">
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-red/30 text-sm text-red hover:bg-red/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear all task history
            </button>
          </Section>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-md bg-accent text-bg-primary text-sm font-medium hover:bg-accent-bright transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="border border-border rounded-xl bg-bg-secondary p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  );
}
