const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
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
};
