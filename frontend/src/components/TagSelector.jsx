import { useEffect, useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { api } from '../api/client';

export default function TagSelector({ taskId }) {
  const [allTags, setAllTags] = useState([]);
  const [taskTags, setTaskTags] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    load();
  }, [taskId]);

  const load = async () => {
    try {
      const [tags, assigned] = await Promise.all([api.getTags(), api.getTaskTags(taskId)]);
      setAllTags(tags);
      setTaskTags(assigned);
    } catch {}
  };

  const handleAdd = async (tagId) => {
    await api.addTagToTask(taskId, tagId);
    load();
    setShowAdd(false);
  };

  const handleRemove = async (tagId) => {
    await api.removeTagFromTask(taskId, tagId);
    load();
  };

  const available = allTags.filter((t) => !taskTags.find((tt) => tt.id === t.id));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {taskTags.map((tag) => (
        <span
          key={tag.id}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
          style={{ backgroundColor: tag.color + '20', color: tag.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
          {tag.name}
          <button onClick={() => handleRemove(tag.id)} className="hover:opacity-70">
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
        >
          <Plus className="w-3 h-3" />
        </button>

        {showAdd && available.length > 0 && (
          <div className="absolute left-0 top-6 z-20 bg-bg-secondary border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
            {available.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleAdd(tag.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
