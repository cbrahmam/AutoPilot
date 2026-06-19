import { useEffect, useState } from 'react';
import {
  Webhook, Plus, Trash2, Copy, ToggleLeft, ToggleRight, Bell, ChevronDown, ChevronRight,
  Loader2, Globe, MessageSquare, ExternalLink, Clock,
} from 'lucide-react';
import { api } from '../api/client';

export default function WebhooksPage() {
  const [tab, setTab] = useState('webhooks');
  const [webhooks, setWebhooks] = useState([]);
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showRuleCreate, setShowRuleCreate] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState(null);
  const [form, setForm] = useState({ name: '', source: 'github', goal_template: '', secret: '' });
  const [ruleForm, setRuleForm] = useState({ name: '', event: 'task_completed', channel: 'webhook', target: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wh, nr, hist] = await Promise.all([
        api.getWebhooks(),
        api.getNotificationRules(),
        api.getNotificationHistory(),
      ]);
      setWebhooks(wh);
      setRules(nr);
      setLogs(hist);
    } catch {}
    setLoading(false);
  };

  const handleCreateWebhook = async () => {
    if (!form.name || !form.goal_template) return;
    await api.createWebhook(form);
    setForm({ name: '', source: 'github', goal_template: '', secret: '' });
    setShowCreate(false);
    loadData();
  };

  const handleDeleteWebhook = async (id) => {
    await api.deleteWebhook(id);
    loadData();
  };

  const handleToggleWebhook = async (wh) => {
    await api.updateWebhook(wh.id, { enabled: !wh.enabled });
    loadData();
  };

  const handleCreateRule = async () => {
    if (!ruleForm.name || !ruleForm.target) return;
    await api.createNotificationRule(ruleForm);
    setRuleForm({ name: '', event: 'task_completed', channel: 'webhook', target: '' });
    setShowRuleCreate(false);
    loadData();
  };

  const handleDeleteRule = async (id) => {
    await api.deleteNotificationRule(id);
    loadData();
  };

  const handleToggleRule = async (rule) => {
    await api.updateNotificationRule(rule.id, { enabled: !rule.enabled });
    loadData();
  };

  const copyUrl = (id) => {
    const url = `${window.location.origin}/api/webhooks/incoming/${id}`;
    navigator.clipboard.writeText(url);
  };

  const toggleLogs = async (webhookId) => {
    if (expandedLogs === webhookId) {
      setExpandedLogs(null);
      return;
    }
    setExpandedLogs(webhookId);
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
        <div className="flex items-center gap-3 mb-6">
          <Webhook className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold text-text-primary">Webhooks & Notifications</h1>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { key: 'webhooks', label: 'Inbound Webhooks', icon: Globe },
            { key: 'notifications', label: 'Notification Rules', icon: Bell },
            { key: 'history', label: 'History', icon: Clock },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                tab === key ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'webhooks' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-text-secondary text-sm">Receive events from external services to auto-trigger tasks.</p>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
              >
                <Plus className="w-4 h-4" /> New Webhook
              </button>
            </div>

            {showCreate && (
              <div className="border border-border rounded-xl bg-bg-secondary p-4 mb-4 space-y-3">
                <input
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                  placeholder="Webhook name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <select
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                >
                  <option value="github">GitHub</option>
                  <option value="slack">Slack</option>
                  <option value="stripe">Stripe</option>
                  <option value="custom">Custom</option>
                </select>
                <textarea
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                  placeholder="Goal template — use {{field.path}} for payload values, e.g. Analyze PR #{{pull_request.number}}: {{pull_request.title}}"
                  rows={2}
                  value={form.goal_template}
                  onChange={(e) => setForm({ ...form, goal_template: e.target.value })}
                />
                <input
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                  placeholder="Secret (optional, for signature verification)"
                  value={form.secret}
                  onChange={(e) => setForm({ ...form, secret: e.target.value })}
                />
                <div className="flex gap-2">
                  <button onClick={handleCreateWebhook} className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90">
                    Create
                  </button>
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {webhooks.length === 0 ? (
              <p className="text-text-muted text-center py-12">No webhooks configured yet.</p>
            ) : (
              <div className="space-y-3">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="border border-border rounded-xl bg-bg-secondary p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-blue" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{wh.name}</p>
                          <p className="text-xs text-text-muted">Source: {wh.source} · Triggered: {wh.trigger_count || 0} times</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => copyUrl(wh.id)} className="text-text-muted hover:text-text-primary" title="Copy URL">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleLogs(wh.id)} className="text-text-muted hover:text-text-primary">
                          {expandedLogs === wh.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleToggleWebhook(wh)} className="text-text-muted hover:text-text-primary">
                          {wh.enabled ? <ToggleRight className="w-5 h-5 text-accent" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => handleDeleteWebhook(wh.id)} className="text-text-muted hover:text-red">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted mt-2 font-mono bg-bg-primary rounded px-2 py-1">{wh.goal_template}</p>
                    {expandedLogs === wh.id && (
                      <WebhookLogsList webhookId={wh.id} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'notifications' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-text-secondary text-sm">Get notified when tasks complete, fail, or need attention.</p>
              <button
                onClick={() => setShowRuleCreate(!showRuleCreate)}
                className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
              >
                <Plus className="w-4 h-4" /> New Rule
              </button>
            </div>

            {showRuleCreate && (
              <div className="border border-border rounded-xl bg-bg-secondary p-4 mb-4 space-y-3">
                <input
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                  placeholder="Rule name"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                />
                <select
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                  value={ruleForm.event}
                  onChange={(e) => setRuleForm({ ...ruleForm, event: e.target.value })}
                >
                  <option value="task_completed">Task Completed</option>
                  <option value="task_failed">Task Failed</option>
                </select>
                <select
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                  value={ruleForm.channel}
                  onChange={(e) => setRuleForm({ ...ruleForm, channel: e.target.value })}
                >
                  <option value="webhook">Webhook (HTTP POST)</option>
                  <option value="slack">Slack</option>
                </select>
                <input
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                  placeholder={ruleForm.channel === 'slack' ? 'Slack webhook URL' : 'Webhook URL'}
                  value={ruleForm.target}
                  onChange={(e) => setRuleForm({ ...ruleForm, target: e.target.value })}
                />
                <div className="flex gap-2">
                  <button onClick={handleCreateRule} className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90">
                    Create
                  </button>
                  <button onClick={() => setShowRuleCreate(false)} className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {rules.length === 0 ? (
              <p className="text-text-muted text-center py-12">No notification rules configured yet.</p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="border border-border rounded-xl bg-bg-secondary p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {rule.channel === 'slack' ? <MessageSquare className="w-4 h-4 text-purple" /> : <ExternalLink className="w-4 h-4 text-blue" />}
                      <div>
                        <p className="text-sm font-medium text-text-primary">{rule.name}</p>
                        <p className="text-xs text-text-muted">
                          On <span className="text-accent">{rule.event}</span> → {rule.channel} → <span className="font-mono">{rule.target.slice(0, 40)}...</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleRule(rule)} className="text-text-muted hover:text-text-primary">
                        {rule.enabled ? <ToggleRight className="w-5 h-5 text-accent" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => handleDeleteRule(rule.id)} className="text-text-muted hover:text-red">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div>
            <p className="text-text-secondary text-sm mb-4">Recent webhook triggers and notification deliveries.</p>
            {logs.length === 0 ? (
              <p className="text-text-muted text-center py-12">No notification history yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="border border-border rounded-lg bg-bg-secondary p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-primary">
                        <span className="font-mono text-xs text-text-muted">{log.task_id?.slice(0, 8)}</span>
                        {' → '}
                        <span className={log.status === 'sent' ? 'text-accent' : 'text-red'}>{log.status}</span>
                      </p>
                      <p className="text-xs text-text-muted">{log.type} · {log.created_at?.slice(0, 19)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WebhookLogsList({ webhookId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWebhookLogs(webhookId)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [webhookId]);

  if (loading) return <p className="text-xs text-text-muted mt-2">Loading logs...</p>;
  if (logs.length === 0) return <p className="text-xs text-text-muted mt-2">No triggers yet.</p>;

  return (
    <div className="mt-3 space-y-1">
      {logs.slice(0, 10).map((log) => (
        <div key={log.id} className="text-xs bg-bg-primary rounded px-2 py-1 flex justify-between">
          <span className="text-text-muted">{log.created_at?.slice(0, 19)}</span>
          <span className={log.status === 'triggered' ? 'text-accent' : 'text-red'}>{log.status}</span>
          <span className="font-mono text-text-muted">{log.task_id?.slice(0, 8)}</span>
        </div>
      ))}
    </div>
  );
}
