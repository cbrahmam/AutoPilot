const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('autopilot_token');
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  createTask: (goal, requireApproval = false, maxIterations = 25) =>
    request('/tasks', {
      method: 'POST',
      body: JSON.stringify({ goal, require_approval: requireApproval, max_iterations: maxIterations }),
    }),

  listTasks: () => request('/tasks'),

  getTask: (id) => request(`/tasks/${id}`),

  planTask: (id) => request(`/tasks/${id}/plan`, { method: 'POST' }),

  getPlan: (id) => request(`/tasks/${id}/plan`),

  updatePlan: (id, updates) =>
    request(`/tasks/${id}/plan`, { method: 'PUT', body: JSON.stringify(updates) }),

  executeTask: (id) => request(`/tasks/${id}/execute`, { method: 'POST' }),

  runTask: (id) => request(`/tasks/${id}/run`, { method: 'POST' }),

  pauseTask: (id) => request(`/tasks/${id}/pause`, { method: 'POST' }),

  resumeTask: (id) => request(`/tasks/${id}/resume`, { method: 'POST' }),

  cancelTask: (id) => request(`/tasks/${id}/cancel`, { method: 'POST' }),

  getAgents: (id) => request(`/tasks/${id}/agents`),

  getLogs: (id) => request(`/tasks/${id}/logs`),

  getWorkspace: (id) => request(`/tasks/${id}/workspace`),

  getWorkspaceFile: (id, path) => request(`/tasks/${id}/workspace/${path}`),

  createFollowup: (id, goal) =>
    request(`/tasks/${id}/followup`, {
      method: 'POST',
      body: JSON.stringify({ goal }),
    }),

  getTemplates: () => request('/templates'),

  useTemplate: (templateId, variables) =>
    request(`/templates/${templateId}/use`, {
      method: 'POST',
      body: JSON.stringify(variables),
    }),

  getStats: () => request('/stats'),

  getTaskCost: (id) => request(`/tasks/${id}/cost`),

  getPlugins: () => request('/plugins'),

  reloadPlugins: () => request('/plugins/reload', { method: 'POST' }),

  getSchedules: () => request('/schedules'),

  createSchedule: (data) =>
    request('/schedules', { method: 'POST', body: JSON.stringify(data) }),

  updateSchedule: (id, data) =>
    request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteSchedule: (id) =>
    request(`/schedules/${id}`, { method: 'DELETE' }),

  getChatSessions: () => request('/chat/sessions'),

  createChatSession: () => request('/chat/sessions', { method: 'POST' }),

  getChatMessages: (sessionId) => request(`/chat/sessions/${sessionId}/messages`),

  deleteChatSession: (sessionId) =>
    request(`/chat/sessions/${sessionId}`, { method: 'DELETE' }),

  getWebhooks: () => request('/webhooks'),

  createWebhook: (data) =>
    request('/webhooks', { method: 'POST', body: JSON.stringify(data) }),

  updateWebhook: (id, data) =>
    request(`/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteWebhook: (id) =>
    request(`/webhooks/${id}`, { method: 'DELETE' }),

  getWebhookLogs: (id) => request(`/webhooks/${id}/logs`),

  getNotificationRules: () => request('/notifications/rules'),

  createNotificationRule: (data) =>
    request('/notifications/rules', { method: 'POST', body: JSON.stringify(data) }),

  updateNotificationRule: (id, data) =>
    request(`/notifications/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteNotificationRule: (id) =>
    request(`/notifications/rules/${id}`, { method: 'DELETE' }),

  getNotificationHistory: (taskId) =>
    request(`/notifications/history${taskId ? `?task_id=${taskId}` : ''}`),

  getKnowledgeDocs: () => request('/knowledge'),

  uploadKnowledgeFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${BASE}/knowledge/upload`, { method: 'POST', body: formData })
      .then(r => { if (!r.ok) throw new Error('Upload failed'); return r.json(); });
  },

  uploadKnowledgeText: (title, content) => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    return fetch(`${BASE}/knowledge/text`, { method: 'POST', body: formData })
      .then(r => { if (!r.ok) throw new Error('Upload failed'); return r.json(); });
  },

  deleteKnowledgeDoc: (id) =>
    request(`/knowledge/${id}`, { method: 'DELETE' }),

  searchKnowledge: (query, topK = 5) =>
    request('/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query, top_k: topK }),
    }),

  reindexKnowledge: () =>
    request('/knowledge/reindex', { method: 'POST' }),

  getAnalyticsOverview: () => request('/analytics/overview'),

  getTasksOverTime: () => request('/analytics/tasks-over-time'),

  getTokensOverTime: () => request('/analytics/tokens-over-time'),

  getAgentPerformance: () => request('/analytics/agent-performance'),

  getToolUsage: () => request('/analytics/tool-usage'),

  getCostBreakdown: () => request('/analytics/cost-breakdown'),

  getRecentTasksAnalytics: () => request('/analytics/recent-tasks'),

  getPipelines: () => request('/pipelines'),

  createPipeline: (data) =>
    request('/pipelines', { method: 'POST', body: JSON.stringify(data) }),

  getPipeline: (id) => request(`/pipelines/${id}`),

  updatePipeline: (id, data) =>
    request(`/pipelines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deletePipeline: (id) =>
    request(`/pipelines/${id}`, { method: 'DELETE' }),

  runPipeline: (id) =>
    request(`/pipelines/${id}/run`, { method: 'POST' }),

  getPipelineRuns: (id) => request(`/pipelines/${id}/runs`),

  getTeams: () => request('/teams'),

  createTeam: (data) =>
    request('/teams', { method: 'POST', body: JSON.stringify(data) }),

  getTeam: (id) => request(`/teams/${id}`),

  deleteTeam: (id) =>
    request(`/teams/${id}`, { method: 'DELETE' }),

  getTeamMembers: (teamId) => request(`/teams/${teamId}/members`),

  addTeamMember: (teamId, data) =>
    request(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(data) }),

  removeTeamMember: (teamId, userId) =>
    request(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),

  updateMemberRole: (teamId, userId, role) =>
    request(`/teams/${teamId}/members/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

  getTaskComments: (taskId) => request(`/tasks/${taskId}/comments`),

  addTaskComment: (taskId, content) =>
    request(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),

  deleteComment: (commentId) =>
    request(`/comments/${commentId}`, { method: 'DELETE' }),

  getActivity: (teamId) =>
    request(`/activity${teamId ? `?team_id=${teamId}` : ''}`),

  getVaultKeys: (teamId) =>
    request(`/vault/keys${teamId ? `?team_id=${teamId}` : ''}`),

  createVaultKey: (data) =>
    request('/vault/keys', { method: 'POST', body: JSON.stringify(data) }),

  updateVaultKey: (id, data) =>
    request(`/vault/keys/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteVaultKey: (id) =>
    request(`/vault/keys/${id}`, { method: 'DELETE' }),

  getApprovalRules: () => request('/approvals/rules'),

  createApprovalRule: (data) =>
    request('/approvals/rules', { method: 'POST', body: JSON.stringify(data) }),

  updateApprovalRule: (id, data) =>
    request(`/approvals/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteApprovalRule: (id) =>
    request(`/approvals/rules/${id}`, { method: 'DELETE' }),

  getPendingApprovals: () => request('/approvals/pending'),

  requestApproval: (taskId, assignedTo) =>
    request('/approvals/request', { method: 'POST', body: JSON.stringify({ task_id: taskId, assigned_to: assignedTo }) }),

  decideApproval: (approvalId, status, comment) =>
    request(`/approvals/${approvalId}/decide`, { method: 'POST', body: JSON.stringify({ status, comment }) }),

  getTaskApprovals: (taskId) => request(`/tasks/${taskId}/approvals`),

  exportReportHtml: (taskId) => `${BASE}/reports/${taskId}/html`,

  exportReportCsv: (taskId) => `${BASE}/reports/${taskId}/csv`,

  createSharedReport: (data) =>
    request('/reports/share', { method: 'POST', body: JSON.stringify(data) }),

  getSharedReports: (taskId) =>
    request(`/reports/shared${taskId ? `?task_id=${taskId}` : ''}`),

  deleteSharedReport: (id) =>
    request(`/reports/shared/${id}`, { method: 'DELETE' }),

  getAuditLogs: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.user_id) qs.set('user_id', params.user_id);
    if (params.action) qs.set('action', params.action);
    if (params.target_type) qs.set('target_type', params.target_type);
    if (params.limit) qs.set('limit', params.limit);
    if (params.offset) qs.set('offset', params.offset);
    return request(`/audit/logs?${qs.toString()}`);
  },

  getAuditStats: () => request('/audit/stats'),

  exportAuditCsv: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.user_id) qs.set('user_id', params.user_id);
    if (params.action) qs.set('action', params.action);
    if (params.limit) qs.set('limit', params.limit);
    return `${BASE}/audit/export/csv?${qs.toString()}`;
  },

  getInboxNotifications: (unreadOnly = false, limit = 50) =>
    request(`/inbox/notifications?unread_only=${unreadOnly}&limit=${limit}`),

  getUnreadCount: () => request('/inbox/unread-count'),

  markNotificationRead: (id) =>
    request(`/inbox/notifications/${id}/read`, { method: 'PUT' }),

  markAllRead: () => request('/inbox/read-all', { method: 'PUT' }),

  deleteNotification: (id) =>
    request(`/inbox/notifications/${id}`, { method: 'DELETE' }),

  clearInbox: () => request('/inbox/clear', { method: 'DELETE' }),

  getProfiles: () => request('/profiles'),

  createProfile: (data) =>
    request('/profiles', { method: 'POST', body: JSON.stringify(data) }),

  getProfile: (id) => request(`/profiles/${id}`),

  updateProfile: (id, data) =>
    request(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteProfile: (id) =>
    request(`/profiles/${id}`, { method: 'DELETE' }),

  duplicateProfile: (id) =>
    request(`/profiles/${id}/duplicate`, { method: 'POST' }),

  getFavorites: (targetType, detailed = false) => {
    const qs = new URLSearchParams();
    if (targetType) qs.set('target_type', targetType);
    if (detailed) qs.set('detailed', 'true');
    return request(`/favorites?${qs.toString()}`);
  },

  addFavorite: (targetType, targetId) =>
    request('/favorites', { method: 'POST', body: JSON.stringify({ target_type: targetType, target_id: targetId }) }),

  removeFavorite: (targetType, targetId) =>
    request('/favorites', { method: 'DELETE', body: JSON.stringify({ target_type: targetType, target_id: targetId }) }),

  checkFavorite: (targetType, targetId) =>
    request(`/favorites/check?target_type=${targetType}&target_id=${targetId}`),

  getHealthCheck: () => request('/health'),

  getHealthHistory: (service, limit = 50) => {
    const qs = new URLSearchParams();
    if (service) qs.set('service', service);
    qs.set('limit', limit);
    return request(`/health/history?${qs.toString()}`);
  },

  getUptime: () => request('/health/uptime'),

  getSystemInfo: () => request('/health/system'),

  getDatabaseInfo: () => request('/health/database'),

  globalSearch: (query, limit = 20) =>
    request(`/search?q=${encodeURIComponent(query)}&limit=${limit}`),

  getTags: () => request('/tags'),

  createTag: (data) =>
    request('/tags', { method: 'POST', body: JSON.stringify(data) }),

  updateTag: (id, data) =>
    request(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteTag: (id) =>
    request(`/tags/${id}`, { method: 'DELETE' }),

  getTagCounts: () => request('/tags/counts'),

  getTaskTags: (taskId) => request(`/tags/task/${taskId}`),

  addTagToTask: (taskId, tagId) =>
    request(`/tags/task/${taskId}/${tagId}`, { method: 'POST' }),

  removeTagFromTask: (taskId, tagId) =>
    request(`/tags/task/${taskId}/${tagId}`, { method: 'DELETE' }),

  getTasksByTag: (tagId) => request(`/tags/tasks/${tagId}`),

  getEnvVars: (scope, scopeId) => {
    const qs = new URLSearchParams();
    if (scope) qs.set('scope', scope);
    if (scopeId) qs.set('scope_id', scopeId);
    return request(`/env/variables?${qs.toString()}`);
  },

  createEnvVar: (data) =>
    request('/env/variables', { method: 'POST', body: JSON.stringify(data) }),

  updateEnvVar: (id, data) =>
    request(`/env/variables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteEnvVar: (id) =>
    request(`/env/variables/${id}`, { method: 'DELETE' }),

  revealEnvVar: (id) => request(`/env/variables/${id}?reveal=true`),

  getTimelineEvents: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.event_type) qs.set('event_type', params.event_type);
    if (params.source) qs.set('source', params.source);
    if (params.limit) qs.set('limit', params.limit);
    if (params.offset) qs.set('offset', params.offset);
    return request(`/timeline/events?${qs.toString()}`);
  },

  getTimelineStats: () => request('/timeline/stats'),

  rebuildTimeline: () => request('/timeline/rebuild', { method: 'POST' }),
};
