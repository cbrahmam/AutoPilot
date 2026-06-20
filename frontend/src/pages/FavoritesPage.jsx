import { useEffect, useState } from 'react';
import { Star, ExternalLink, Trash2, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const TYPE_LABELS = {
  task: { label: 'Tasks', color: 'bg-blue-500/20 text-blue-400' },
  pipeline: { label: 'Pipelines', color: 'bg-purple-500/20 text-purple-400' },
  template: { label: 'Templates', color: 'bg-green-500/20 text-green-400' },
};

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      setFavorites(await api.getFavorites(filter || undefined, true));
    } catch {}
    setLoading(false);
  };

  const handleRemove = async (targetType, targetId) => {
    await api.removeFavorite(targetType, targetId);
    load();
  };

  const handleNavigate = (fav) => {
    if (fav.target_type === 'task') navigate(`/task/${fav.target_id}`);
    else if (fav.target_type === 'pipeline') navigate('/pipelines');
    else if (fav.target_type === 'template') navigate('/templates');
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <Star className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Favorites</h1>
            <p className="text-sm text-text-muted">Quick access to your bookmarked items</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            className="bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All types</option>
            <option value="task">Tasks</option>
            <option value="pipeline">Pipelines</option>
            <option value="template">Templates</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-text-muted py-8">Loading favorites...</p>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-xl bg-bg-secondary">
          <Star className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No favorites yet</p>
          <p className="text-text-muted text-xs mt-1">Star tasks, pipelines, or templates to bookmark them</p>
        </div>
      ) : (
        <div className="space-y-2">
          {favorites.map((fav) => {
            const typeInfo = TYPE_LABELS[fav.target_type] || { label: fav.target_type, color: 'bg-gray-500/20 text-gray-400' };
            const detail = fav.detail;
            return (
              <div
                key={fav.id}
                onClick={() => handleNavigate(fav)}
                className="flex items-center justify-between border border-border rounded-xl bg-bg-secondary px-4 py-3 hover:border-border/80 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Star className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <p className="text-sm text-text-primary truncate">
                        {detail?.goal || detail?.name || fav.target_id.substring(0, 12) + '...'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {detail?.status && (
                        <span className="text-[11px] text-text-muted capitalize">{detail.status}</span>
                      )}
                      <span className="text-[11px] text-text-muted">
                        Saved {formatTime(fav.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(fav.target_type, fav.target_id); }}
                    className="p-1.5 text-text-muted hover:text-red rounded hover:bg-bg-tertiary"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
