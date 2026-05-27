import { create } from 'zustand';
import { toast } from '../components/Toast';

export const useTaskStore = create((set, get) => ({
  tasks: [],
  currentTask: null,
  plan: null,
  events: [],
  agents: [],
  isExecuting: false,
  approvalRequest: null,
  progress: null,

  setTasks: (tasks) => set({ tasks }),

  setCurrentTask: (task) => set({ currentTask: task }),

  setPlan: (plan) => set({ plan }),

  setIsExecuting: (val) => set({ isExecuting: val }),

  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),

  clearEvents: () => set({ events: [], progress: null }),

  updateAgent: (agentData) =>
    set((state) => {
      const existing = state.agents.findIndex(
        (a) => a.name === agentData.name || a.subtask_id === agentData.subtask_id
      );
      if (existing >= 0) {
        const updated = [...state.agents];
        updated[existing] = { ...updated[existing], ...agentData };
        return { agents: updated };
      }
      return { agents: [...state.agents, agentData] };
    }),

  clearAgents: () => set({ agents: [] }),

  setApprovalRequest: (req) => set({ approvalRequest: req }),

  handleWSEvent: (event) => {
    const { type, agent_name, data } = event;

    get().addEvent(event);

    switch (type) {
      case 'status_change':
        get().updateAgent({ name: agent_name, status: data.status });
        break;
      case 'agent_start':
        get().updateAgent({
          name: `${data.agent_type}_${data.subtask_id}`,
          subtask_id: data.subtask_id,
          role: data.agent_type,
          title: data.title,
          status: 'thinking',
        });
        break;
      case 'agent_complete':
        get().updateAgent({
          name: data.agent_name,
          subtask_id: data.subtask_id,
          status: data.status,
          duration_ms: data.duration_ms,
        });
        toast(`${data.agent_name} ${data.status}`, data.status === 'completed' ? 'success' : 'error');
        break;
      case 'progress':
        set({ progress: data });
        break;
      case 'human_request':
        get().setApprovalRequest(data);
        break;
      case 'complete':
        set({ isExecuting: false, progress: { percentage: 100, completed: data.subtasks_completed || 1, total: data.subtasks_completed || 1 } });
        toast('Task completed', 'success');
        break;
      case 'error':
        set({ isExecuting: false });
        toast(`Error: ${data.error?.slice(0, 80) || 'Unknown error'}`, 'error');
        break;
      default:
        break;
    }
  },
}));
