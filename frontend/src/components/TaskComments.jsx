import { useEffect, useState } from 'react';
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react';
import { api } from '../api/client';

export default function TaskComments({ taskId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { loadComments(); }, [taskId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await api.getTaskComments(taskId);
      setComments(data);
    } catch {}
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      await api.addTaskComment(taskId, newComment);
      setNewComment('');
      loadComments();
    } catch {}
    setSending(false);
  };

  const handleDelete = async (id) => {
    await api.deleteComment(id);
    loadComments();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-medium text-text-primary">Comments ({comments.length})</h3>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted"><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Loading...</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="bg-bg-primary rounded-lg px-3 py-2 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary">{c.display_name || c.email || 'Anonymous'}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted">{c.created_at?.slice(0, 16)}</span>
                  <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red transition-opacity">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-text-secondary mt-0.5">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={sending || !newComment.trim()}
          className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
