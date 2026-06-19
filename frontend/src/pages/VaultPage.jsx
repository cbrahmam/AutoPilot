import { useEffect, useState } from 'react';
import {
  KeyRound, Plus, Trash2, Eye, EyeOff, Loader2, Shield, Cloud, Database, Code,
} from 'lucide-react';
import { api } from '../api/client';

const SERVICE_ICONS = {
  openai: Cloud,
  google: Cloud,
  aws: Database,
  github: Code,
  anthropic: Shield,
};

const SERVICE_PRESETS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google Cloud' },
  { value: 'aws', label: 'AWS' },
  { value: 'github', label: 'GitHub' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'slack', label: 'Slack' },
  { value: 'custom', label: 'Custom' },
];

export default function VaultPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showKey, setShowKey] = useState(null);
  const [form, setForm] = useState({ name: '', service: 'openai', api_key: '' });

  useEffect(() => { loadKeys(); }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const data = await api.getVaultKeys();
      setKeys(data);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.api_key) return;
    await api.createVaultKey(form);
    setForm({ name: '', service: 'openai', api_key: '' });
    setShowCreate(false);
    loadKeys();
  };

  const handleDelete = async (id) => {
    await api.deleteVaultKey(id);
    loadKeys();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <KeyRound className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold text-text-primary">API Key Vault</h1>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
          >
            <Plus className="w-4 h-4" /> Add Key
          </button>
        </div>

        <p className="text-text-secondary text-sm mb-6">
          Securely store API keys for external services. Agents can access these during task execution. Keys are encrypted at rest.
        </p>

        {showCreate && (
          <div className="border border-border rounded-xl bg-bg-secondary p-4 mb-4 space-y-3">
            <input
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
              placeholder="Key name (e.g. Production OpenAI Key)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
              value={form.service}
              onChange={(e) => setForm({ ...form, service: e.target.value })}
            >
              {SERVICE_PRESETS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <div className="relative">
              <input
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm pr-10 font-mono"
                type={showKey === 'create' ? 'text' : 'password'}
                placeholder="sk-... or API key value"
                value={form.api_key}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              />
              <button
                onClick={() => setShowKey(showKey === 'create' ? null : 'create')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showKey === 'create' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90">
                Store Key
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {keys.length === 0 ? (
          <p className="text-text-muted text-center py-12">No API keys stored yet.</p>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => {
              const Icon = SERVICE_ICONS[k.service] || KeyRound;
              return (
                <div key={k.id} className="border border-border rounded-xl bg-bg-secondary p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{k.name}</p>
                      <p className="text-xs text-text-muted">
                        {k.service} · Used {k.use_count || 0} times
                        {k.last_used && ` · Last: ${k.last_used.slice(0, 10)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-text-muted bg-bg-primary px-2 py-1 rounded">
                      {k.service}
                    </span>
                    <button onClick={() => handleDelete(k.id)} className="text-text-muted hover:text-red">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 border border-border rounded-xl bg-bg-secondary p-4">
          <h3 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" /> Security
          </h3>
          <ul className="text-xs text-text-muted space-y-1">
            <li>Keys are encrypted at rest using HMAC-SHA256 derived key</li>
            <li>Keys are never exposed in API responses after creation</li>
            <li>Agents access keys by service name during execution</li>
            <li>Usage is tracked with access count and last-used timestamp</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
