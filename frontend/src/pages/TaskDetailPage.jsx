import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Pause, Play, XCircle, ArrowLeft, Activity, Terminal, FolderOpen, BarChart3,
} from 'lucide-react';
import { api } from '../api/client';
import { useTaskStore } from '../store/taskStore';
import { useWebSocket } from '../hooks/useWebSocket';
import ExecutionStream from '../components/ExecutionStream';
import Sidebar from '../components/Sidebar';
import ApprovalModal from '../components/ApprovalModal';
import TerminalView from '../components/TerminalView';
import WorkspaceViewer from '../components/WorkspaceViewer';
import TaskResult from '../components/TaskResult';
import ShortcutsModal, { useKeyboardShortcuts } from '../components/KeyboardShortcuts';
import StreamingPreview from '../components/StreamingPreview';
import TaskComments from '../components/TaskComments';
import ReportExport from '../components/ReportExport';
import { toast } from '../components/Toast';

import { Eye, MessageSquare, Download } from 'lucide-react';

const TABS = [
  { id: 'execution', label: 'Execution', icon: Activity },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'workspace', label: 'Workspace', icon: FolderOpen },
  { id: 'result', label: 'Result', icon: BarChart3 },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'export', label: 'Export', icon: Download },
];

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
  const [activeTab, setActiveTab] = useState('execution');

  const isDone = currentTask?.status === 'completed' || currentTask?.status === 'failed';

  const handlePause = async () => {
    try { await api.pauseTask(taskId); toast('Task paused', 'info'); } catch {}
  };
  const handleResume = async () => {
    try { await api.resumeTask(taskId); toast('Task resumed', 'info'); } catch {}
  };
  const handleCancel = async () => {
    try { await api.cancelTask(taskId); toast('Task cancelled', 'warning'); } catch {}
  };

  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    onPause: isExecuting ? handlePause : undefined,
    onResume: currentTask?.status === 'paused' ? handleResume : undefined,
    onCancel: isExecuting ? handleCancel : undefined,
  });

  useEffect(() => {
    clearEvents();
    clearAgents();
    loadTask();
    return () => {
      setIsExecuting(false);
    };
  }, [taskId]);

  useEffect(() => {
    if (isDone && !isExecuting) {
      setActiveTab('result');
    }
  }, [isDone, isExecuting]);

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

  const handleApprovalRespond = (requestId, approved, response) => {
    sendMessage({ type: 'human_response', request_id: requestId, approved, response });
    setApprovalRequest(null);
  };

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

      {/* Tab bar */}
      <div className="border-b border-border bg-bg-secondary flex">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {activeTab === 'execution' && <ExecutionStream />}
          {activeTab === 'preview' && (
            <div className="p-4 overflow-y-auto h-full">
              <StreamingPreview events={events} finalResult={isDone ? currentTask?.result : null} />
            </div>
          )}
          {activeTab === 'terminal' && <TerminalView />}
          {activeTab === 'workspace' && <WorkspaceViewer taskId={taskId} />}
          {activeTab === 'result' && <TaskResult task={currentTask} events={events} />}
          {activeTab === 'comments' && (
            <div className="p-4">
              <TaskComments taskId={taskId} />
            </div>
          )}
          {activeTab === 'export' && (
            <div className="p-4">
              <ReportExport taskId={taskId} />
            </div>
          )}
        </div>
        {activeTab === 'execution' && <Sidebar />}
      </div>

      {error && (
        <div className="border-t border-red/30 bg-red/5 px-4 py-2">
          <p className="text-sm text-red">{error}</p>
        </div>
      )}

      <ApprovalModal request={approvalRequest} onRespond={handleApprovalRespond} />
      <ShortcutsModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
