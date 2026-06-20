import { useEffect, useState, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';

const CATEGORY_ICONS = {
  success: { icon: CheckCircle2, color: 'text-green-400' },
  error: { icon: AlertCircle, color: 'text-red-400' },
  warning: { icon: AlertTriangle, color: 'text-amber-400' },
  info: { icon: Info, color: 'text-blue-400' },
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchCount = async () => {
    try {
      const data = await api.getUnreadCount();
      setUnreadCount(data.count);
    } catch {}
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getInboxNotifications(false, 30);
      setNotifications(data);
    } catch {}
    setLoading(false);
  };

  const handleMarkRead = async (id) => {
    await api.markNotificationRead(id);
    setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: 1 } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await api.markAllRead();
    setNotifications((n) => n.map((x) => ({ ...x, read: 1 })));
    setUnreadCount(0);
  };

  const handleDelete = async (id) => {
    const n = notifications.find((x) => x.id === id);
    await api.deleteNotification(id);
    setNotifications((ns) => ns.filter((x) => x.id !== id));
    if (n && !n.read) setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleClick = (notification) => {
    if (!notification.read) handleMarkRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-bg-secondary border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <span className="text-sm font-medium text-text-primary">Notifications</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-accent hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="text-center text-text-muted text-sm py-6">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="text-center text-text-muted text-sm py-6">No notifications</p>
            ) : (
              notifications.map((n) => {
                const cat = CATEGORY_ICONS[n.category] || CATEGORY_ICONS.info;
                const Icon = cat.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex items-start gap-2.5 px-3 py-2.5 border-b border-border/50 cursor-pointer hover:bg-bg-tertiary/50 transition-colors ${
                      !n.read ? 'bg-accent/5' : ''
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cat.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-medium truncate ${!n.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {n.title}
                        </p>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
                      </div>
                      {n.message && (
                        <p className="text-[11px] text-text-muted truncate mt-0.5">{n.message}</p>
                      )}
                      <p className="text-[10px] text-text-muted mt-0.5">{formatTime(n.created_at)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                      className="text-text-muted hover:text-red-400 flex-shrink-0 mt-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
