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
};
