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
};
