import { useEffect, useState } from 'react';
import {
  ShieldCheck, Plus, Trash2, CheckCircle2, XCircle, Clock, Loader2,
  ToggleLeft, ToggleRight, AlertTriangle, MessageSquare,
} from 'lucide-react';
import { api } from '../api/client';

export default function ApprovalsPage() {
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [decisionComment, setDecisionComment] = useState({});
  const [form, setForm] = useState({ name: '', condition: '', approvers: '', auto_approve_after: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        api.getPendingApprovals(),
        api.getApprovalRules(),
      ]);
      setPending(p);
      setRules(r);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.condition) return;
    const approvers = form.approvers.split(',').map(s => s.trim()).filter(Boolean);
    await api.createApprovalRule({ ...form, approvers });
    setForm({ name: '', condition: '', approvers: '', auto_approve_after: 0 });
    setShowCreate(false);
    loadData();
  };

  const handleDeleteRule = async (id) => {
    await api.deleteApprovalRule(id);
    loadData();
  };

  const handleToggleRule = async (rule) => {
    await api.updateApprovalRule(rule.id, { enabled: !rule.enabled });
    loadData();
  };

  const handleDecide = async (approvalId, status) => {
    const comment = decisionComment[approvalId] || '';
    await api.decideApproval(approvalId, status, comment);
    setDecisionComment({ ...decisionComment, [approvalId]: '' });
    loadData();
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
          <ShieldCheck className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold text-text-primary">Approvals</h1>
          {pending.length > 0 && (
            <span className="bg-yellow/20 text-yellow text-xs font-medium px-2 py-0.5 rounded-full">
              {pending.length} pending
            </span>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { key: 'pending', label: 'Pending Approvals', icon: Clock },
            { key: 'rules', label: 'Approval Rules', icon: ShieldCheck },
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

        {tab === 'pending' && (
          <div>
            <p className="text-text-secondary text-sm mb-4">Tasks waiting for your approval before execution.</p>
            {pending.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-accent/30 mx-auto mb-3" />
                <p className="text-text-muted">No pending approvals. All clear.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((a) => (
                  <div key={a.id} className="border border-border rounded-xl bg-bg-secondary p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-yellow" />
                          <span className="text-sm font-medium text-text-primary">Approval Required</span>
                        </div>
                        <p className="text-sm text-text-secondary ml-6">{a.goal || `Task ${a.task_id?.slice(0, 8)}`}</p>
                        <p className="text-xs text-text-muted ml-6 mt-1">
                          Requested: {a.created_at?.slice(0, 19)} · By: {a.requested_by?.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 ml-6 space-y-2">
                      <input
                        className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm"
                        placeholder="Comment (optional)"
                        value={decisionComment[a.id] || ''}
                        onChange={(e) => setDecisionComment({ ...decisionComment, [a.id]: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDecide(a.id, 'approved')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleDecide(a.id, 'rejected')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red text-white rounded-lg text-sm hover:bg-red/90"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'rules' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-text-secondary text-sm">Define when tasks require approval before execution.</p>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
              >
                <Plus className="w-4 h-4" /> New Rule
              </button>
            </div>

            {showCreate && (
              <div className="border border-border rounded-xl bg-bg-secondary p-4 mb-4 space-y-3">
                <input
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                  placeholder="Rule name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                  placeholder="Condition — keyword to match in goal (or 'all' for every task)"
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                />
                <input
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                  placeholder="Approver emails (comma-separated)"
                  value={form.approvers}
                  onChange={(e) => setForm({ ...form, approvers: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-muted">Auto-approve after (minutes, 0 = never):</label>
                  <input
                    type="number"
                    className="w-20 bg-bg-primary border border-border rounded-lg px-2 py-1 text-text-primary text-sm"
                    value={form.auto_approve_after}
                    onChange={(e) => setForm({ ...form, auto_approve_after: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreate} className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90">
                    Create Rule
                  </button>
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {rules.length === 0 ? (
              <p className="text-text-muted text-center py-12">No approval rules defined yet.</p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="border border-border rounded-xl bg-bg-secondary p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{rule.name}</p>
                      <p className="text-xs text-text-muted">
                        Condition: <span className="text-accent">{rule.condition}</span>
                        {' · '}Approvers: {(rule.approvers || []).join(', ')}
                        {rule.auto_approve_after > 0 && ` · Auto-approve: ${rule.auto_approve_after}min`}
                      </p>
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
      </div>
    </div>
  );
}
