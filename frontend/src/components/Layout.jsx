import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, History, Cpu, LayoutTemplate, BarChart3, Settings, Puzzle, Clock, MessageSquare, LogOut, Webhook } from 'lucide-react';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('autopilot_user')); } catch { return null; } })();

  const handleLogout = () => {
    localStorage.removeItem('autopilot_token');
    localStorage.removeItem('autopilot_user');
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: Plus, label: 'New Task' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/templates', icon: LayoutTemplate, label: 'Templates' },
    { path: '/history', icon: History, label: 'History' },
    { path: '/stats', icon: BarChart3, label: 'Stats' },
    { path: '/schedules', icon: Clock, label: 'Schedules' },
    { path: '/plugins', icon: Puzzle, label: 'Plugins' },
    { path: '/webhooks', icon: Webhook, label: 'Webhooks' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-bg-primary">
      <aside className="w-56 border-r border-border bg-bg-secondary flex flex-col">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <Cpu className="w-6 h-6 text-accent" />
            <span className="text-lg font-bold text-text-primary">AutoPilot</span>
          </Link>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm no-underline mb-1 transition-colors ${
                location.pathname === path
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          {user ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted truncate">{user.display_name || user.email}</span>
              <button onClick={handleLogout} className="text-text-muted hover:text-text-primary">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-text-muted">AutoPilot v0.2.0</p>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
