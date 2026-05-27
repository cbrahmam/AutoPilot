import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Search, Code, BarChart3 } from 'lucide-react';
import TaskInput from '../components/TaskInput';
import PlanView from '../components/PlanView';
import { api } from '../api/client';
import { useTaskStore } from '../store/taskStore';
import { SAMPLE_TASKS } from '../data/sampleTasks';

const DEMO_ICONS = { 'demo-ai-assistants': Search, 'demo-maze-solver': Code, 'demo-sales-analysis': BarChart3 };

export default function NewTaskPage() {
  const navigate = useNavigate();
  const setPlan = useTaskStore((s) => s.setPlan);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [plan, setLocalPlan] = useState(null);
  const [error, setError] = useState(null);

  const handlePlan = async (goal, requireApproval, maxIterations) => {
    setLoading(true);
    setError(null);
    try {
      const task = await api.createTask(goal, requireApproval, maxIterations);
      setTaskId(task.id);
      const planData = await api.planTask(task.id);
      setLocalPlan(planData);
      setPlan(planData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async (goal, requireApproval, maxIterations) => {
    setLoading(true);
    setError(null);
    try {
      const task = await api.createTask(goal, requireApproval, maxIterations);
      await api.executeTask(task.id);
      navigate(`/task/${task.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePlan = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      await api.executeTask(taskId);
      navigate(`/task/${taskId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReplan = async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const planData = await api.planTask(taskId);
      setLocalPlan(planData);
      setPlan(planData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      {!plan ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <TaskInput onSubmit={handleRun} onPlan={handlePlan} loading={loading} />
          {error && (
            <p className="mt-4 text-sm text-red">{error}</p>
          )}

          <div className="max-w-3xl w-full mt-10">
            <p className="text-xs text-text-muted mb-3 uppercase tracking-wider">Try AutoPilot</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SAMPLE_TASKS.map((demo) => {
                const Icon = DEMO_ICONS[demo.id] || Play;
                return (
                  <Link
                    key={demo.id}
                    to={`/demo/${demo.id}`}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-bg-secondary hover:bg-bg-tertiary transition-colors no-underline group"
                  >
                    <Icon className="w-4 h-4 text-purple shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-text-secondary group-hover:text-text-primary truncate">
                        {demo.goal}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {demo.total_tool_calls} tool calls &middot; {(demo.total_tokens / 1000).toFixed(1)}k tokens
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <PlanView
            plan={plan}
            onExecute={handleExecutePlan}
            onReplan={handleReplan}
          />
          {error && (
            <p className="mt-4 text-sm text-red px-6">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
