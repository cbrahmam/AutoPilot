import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, CheckCircle2 } from 'lucide-react';
import { SAMPLE_TASKS } from '../data/sampleTasks';
import ExecutionStream from '../components/ExecutionStream';
import TaskResult from '../components/TaskResult';
import { useTaskStore } from '../store/taskStore';

export default function DemoReplayPage() {
  const { demoId } = useParams();
  const navigate = useNavigate();
  const clearEvents = useTaskStore((s) => s.clearEvents);
  const addEvent = useTaskStore((s) => s.addEvent);
  const events = useTaskStore((s) => s.events);
  const [task, setTask] = useState(null);
  const [replaying, setReplaying] = useState(false);
  const [done, setDone] = useState(false);
  const [activeTab, setActiveTab] = useState('execution');
  const timerRef = useRef(null);

  const demo = SAMPLE_TASKS.find((t) => t.id === demoId);

  useEffect(() => {
    clearEvents();
    setDone(false);
    setReplaying(false);
    setActiveTab('execution');
    if (demo) {
      setTask(demo);
      startReplay(demo.events);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [demoId]);

  const startReplay = (demoEvents) => {
    setReplaying(true);
    let i = 0;
    const play = () => {
      if (i >= demoEvents.length) {
        setReplaying(false);
        setDone(true);
        setActiveTab('result');
        return;
      }
      addEvent(demoEvents[i]);
      i++;
      timerRef.current = setTimeout(play, 400 + Math.random() * 300);
    };
    play();
  };

  if (!demo) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        Demo task not found.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-bg-secondary">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/')} className="text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-text-primary truncate">{task?.goal}</p>
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple/20 text-purple font-medium shrink-0">DEMO</span>
            </div>
            <p className="text-xs text-text-muted">
              {replaying ? 'Replaying execution...' : done ? 'Replay complete' : 'Starting...'}
            </p>
          </div>
        </div>
        {replaying && (
          <div className="flex items-center gap-2 text-xs text-accent">
            <Play className="w-3 h-3" />
            Replaying
          </div>
        )}
      </div>

      <div className="border-b border-border bg-bg-secondary flex">
        <button
          onClick={() => setActiveTab('execution')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'execution' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          Execution
        </button>
        <button
          onClick={() => setActiveTab('result')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'result' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          Result
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'execution' && <ExecutionStream />}
        {activeTab === 'result' && <TaskResult task={task} events={events} />}
      </div>
    </div>
  );
}
