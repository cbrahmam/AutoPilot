import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { api } from '../api/client';

export default function FavoriteButton({ targetType, targetId, size = 'sm' }) {
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    check();
  }, [targetType, targetId]);

  const check = async () => {
    try {
      const data = await api.checkFavorite(targetType, targetId);
      setFavorited(data.favorited);
    } catch {}
  };

  const toggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    try {
      if (favorited) {
        await api.removeFavorite(targetType, targetId);
        setFavorited(false);
      } else {
        await api.addFavorite(targetType, targetId);
        setFavorited(true);
      }
    } catch {}
    setLoading(false);
  };

  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`transition-colors disabled:opacity-50 ${
        favorited ? 'text-amber-400' : 'text-text-muted hover:text-amber-400'
      }`}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star className={sizeClass} fill={favorited ? 'currentColor' : 'none'} />
    </button>
  );
}
