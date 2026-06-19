import { useEffect, useState } from 'react';
import {
  Users, Plus, Trash2, UserPlus, Shield, UserCheck, Crown,
  Loader2, ChevronDown, ChevronRight, Activity, MessageSquare, X,
} from 'lucide-react';
import { api } from '../api/client';

const ROLE_ICON = {
  admin: <Crown className="w-3 h-3 text-yellow" />,
  member: <UserCheck className="w-3 h-3 text-accent" />,
  viewer: <Shield className="w-3 h-3 text-text-muted" />,
};

export default function TeamsPage() {
  const [tab, setTab] = useState('teams');
  const [teams, setTeams] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, a] = await Promise.all([
        api.getTeams(),
        api.getActivity(),
      ]);
      setTeams(t);
      setActivity(a);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name) return;
    await api.createTeam(form);
    setForm({ name: '', description: '' });
    setShowCreate(false);
    loadData();
  };

  const handleDelete = async (id) => {
    await api.deleteTeam(id);
    loadData();
  };

  const toggleTeam = async (id) => {
    if (expandedTeam === id) {
      setExpandedTeam(null);
      return;
    }
    setExpandedTeam(id);
    try {
      const m = await api.getTeamMembers(id);
      setMembers(m);
    } catch {}
  };

  const handleInvite = async (teamId) => {
    if (!inviteEmail) return;
    try {
      await api.addTeamMember(teamId, { email: inviteEmail, role: inviteRole });
      setInviteEmail('');
      const m = await api.getTeamMembers(teamId);
      setMembers(m);
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleRemoveMember = async (teamId, userId) => {
    await api.removeTeamMember(teamId, userId);
    const m = await api.getTeamMembers(teamId);
    setMembers(m);
  };

  const handleRoleChange = async (teamId, userId, role) => {
    await api.updateMemberRole(teamId, userId, role);
    const m = await api.getTeamMembers(teamId);
    setMembers(m);
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
            <Users className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold text-text-primary">Teams</h1>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
          >
            <Plus className="w-4 h-4" /> New Team
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { key: 'teams', label: 'Teams', icon: Users },
            { key: 'activity', label: 'Activity Feed', icon: Activity },
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

        {tab === 'teams' && (
          <>
            {showCreate && (
              <div className="border border-border rounded-xl bg-bg-secondary p-4 mb-4 space-y-3">
                <input
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                  placeholder="Team name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <div className="flex gap-2">
                  <button onClick={handleCreate} className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90">
                    Create Team
                  </button>
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {teams.length === 0 ? (
              <p className="text-text-muted text-center py-12">No teams created yet.</p>
            ) : (
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team.id} className="border border-border rounded-xl bg-bg-secondary p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-accent" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{team.name}</p>
                          {team.description && <p className="text-xs text-text-muted">{team.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleTeam(team.id)} className="text-text-muted hover:text-text-primary">
                          {expandedTeam === team.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(team.id)} className="text-text-muted hover:text-red">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {expandedTeam === team.id && (
                      <div className="mt-4 space-y-3">
                        <div className="flex gap-2">
                          <input
                            className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm"
                            placeholder="Invite by email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                          />
                          <select
                            className="bg-bg-primary border border-border rounded-lg px-2 py-1.5 text-text-primary text-xs"
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button onClick={() => handleInvite(team.id)} className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm">
                            <UserPlus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-1">
                          {members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between bg-bg-primary rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2">
                                {ROLE_ICON[m.role] || ROLE_ICON.member}
                                <span className="text-sm text-text-primary">{m.display_name || m.email}</span>
                                <span className="text-xs text-text-muted">({m.role})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  className="bg-bg-secondary border border-border rounded px-1 py-0.5 text-xs text-text-primary"
                                  value={m.role}
                                  onChange={(e) => handleRoleChange(team.id, m.user_id, e.target.value)}
                                >
                                  <option value="admin">Admin</option>
                                  <option value="member">Member</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                                <button onClick={() => handleRemoveMember(team.id, m.user_id)} className="text-text-muted hover:text-red">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'activity' && (
          <div>
            <p className="text-text-secondary text-sm mb-4">Recent activity across all teams.</p>
            {activity.length === 0 ? (
              <p className="text-text-muted text-center py-12">No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {activity.map((a) => (
                  <div key={a.id} className="border border-border rounded-lg bg-bg-secondary p-3 flex items-start gap-3">
                    <Activity className="w-4 h-4 text-accent mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-text-primary">
                        <span className="font-medium">{a.display_name || a.email || 'Someone'}</span>
                        {' '}{a.action.replace(/_/g, ' ')}
                      </p>
                      {a.details && <p className="text-xs text-text-muted mt-0.5">{a.details}</p>}
                      <p className="text-xs text-text-muted mt-1">{a.created_at?.slice(0, 19)}</p>
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
