import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TaskInput from '../components/TaskInput';
import PlanView from '../components/PlanView';
import { api } from '../api/client';
import { useTaskStore } from '../store/taskStore';

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
