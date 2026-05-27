import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useTaskStore } from '../store/taskStore';
import TaskHistory from '../components/TaskHistory';
import { Search } from 'lucide-react';

export default function HistoryPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const setTasks = useTaskStore((s) => s.setTasks);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await api.listTasks();
      setTasks(data);
    } catch {}
    setLoading(false);
  };

  const filtered = tasks.filter((t) => {
    if (search && !t.goal.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="text-xl font-bold text-text-primary mb-4">Task History</h2>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 border border-border rounded-md bg-bg-secondary px-3 py-1.5">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-border rounded-md bg-bg-secondary text-sm text-text-secondary px-3 py-1.5 outline-none"
        >
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="running">Running</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg border border-border bg-bg-secondary">
              <div className="skeleton h-4 w-3/4 mb-2" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <TaskHistory tasks={filtered} />
      )}
    </div>
  );
}
