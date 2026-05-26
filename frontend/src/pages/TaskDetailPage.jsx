import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pause, Play, XCircle, ArrowLeft } from 'lucide-react';
import { api } from '../api/client';
import { useTaskStore } from '../store/taskStore';
import { useWebSocket } from '../hooks/useWebSocket';
import ExecutionStream from '../components/ExecutionStream';
import Sidebar from '../components/Sidebar';
import ApprovalModal from '../components/ApprovalModal';

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { sendMessage } = useWebSocket(taskId);

  const currentTask = useTaskStore((s) => s.currentTask);
  const setCurrentTask = useTaskStore((s) => s.setCurrentTask);
  const isExecuting = useTaskStore((s) => s.isExecuting);
  const setIsExecuting = useTaskStore((s) => s.setIsExecuting);
  const clearEvents = useTaskStore((s) => s.clearEvents);
  const clearAgents = useTaskStore((s) => s.clearAgents);
  const approvalRequest = useTaskStore((s) => s.approvalRequest);
  const setApprovalRequest = useTaskStore((s) => s.setApprovalRequest);
  const events = useTaskStore((s) => s.events);

  const [error, setError] = useState(null);

  useEffect(() => {
    clearEvents();
    clearAgents();
    loadTask();
    return () => {
      setIsExecuting(false);
    };
  }, [taskId]);

  const loadTask = async () => {
    try {
      const task = await api.getTask(taskId);
      setCurrentTask(task);
      if (task.status === 'running' || task.status === 'planning') {
        setIsExecuting(true);
      }
      if (task.status === 'completed' || task.status === 'failed') {
        const logs = await api.getLogs(taskId);
        logs.forEach((log) => {
          useTaskStore.getState().addEvent({
            type: log.action_type,
            agent_name: log.agent_name,
            task_id: taskId,
            data: JSON.parse(log.content || '{}'),
            timestamp: log.timestamp,
          });
        });
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handlePause = async () => {
    try { await api.pauseTask(taskId); } catch {}
  };

  const handleResume = async () => {
    try { await api.resumeTask(taskId); } catch {}
  };

  const handleCancel = async () => {
    try { await api.cancelTask(taskId); } catch {}
  };

  const handleApprovalRespond = (requestId, approved, response) => {
    sendMessage({ type: 'human_response', request_id: requestId, approved, response });
    setApprovalRequest(null);
  };

  const completeEvent = events.find((e) => e.type === 'complete');
  const finalOutput = completeEvent?.data?.output || currentTask?.result;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-bg-secondary">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {currentTask?.goal || 'Loading...'}
            </p>
            <p className="text-xs text-text-muted capitalize">{currentTask?.status || ''}</p>
          </div>
        </div>
        {isExecuting && (
          <div className="flex gap-2">
            <button
              onClick={handlePause}
              className="flex items-center gap-1 px-2 py-1 rounded border border-border text-xs text-text-secondary hover:bg-bg-tertiary"
            >
              <Pause className="w-3 h-3" /> Pause
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-2 py-1 rounded border border-red/30 text-xs text-red hover:bg-red/10"
            >
              <XCircle className="w-3 h-3" /> Cancel
            </button>
          </div>
        )}
        {currentTask?.status === 'paused' && (
          <button
            onClick={handleResume}
            className="flex items-center gap-1 px-2 py-1 rounded border border-accent/30 text-xs text-accent hover:bg-accent/10"
          >
            <Play className="w-3 h-3" /> Resume
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <ExecutionStream />
          {finalOutput && !isExecuting && (
            <div className="border-t border-border p-4 bg-bg-secondary max-h-64 overflow-y-auto">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Result</h3>
              <div className="text-sm text-text-secondary whitespace-pre-wrap font-mono">
                {finalOutput}
              </div>
            </div>
          )}
        </div>
        <Sidebar />
      </div>

      {error && (
        <div className="border-t border-red/30 bg-red/5 px-4 py-2">
          <p className="text-sm text-red">{error}</p>
        </div>
      )}

      <ApprovalModal request={approvalRequest} onRespond={handleApprovalRespond} />
    </div>
  );
}
