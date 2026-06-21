import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, History, Cpu, LayoutTemplate, BarChart3, Settings, Puzzle, Clock, MessageSquare, LogOut, Webhook, BookOpen, TrendingUp, GitBranch, Users, KeyRound, ShieldCheck, Shield, Bot, Star, HeartPulse, Search, Tag, Variable, Activity, HardDrive, SlidersHorizontal } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

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
    { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
    { path: '/schedules', icon: Clock, label: 'Schedules' },
    { path: '/plugins', icon: Puzzle, label: 'Plugins' },
    { path: '/webhooks', icon: Webhook, label: 'Webhooks' },
    { path: '/knowledge', icon: BookOpen, label: 'Knowledge' },
    { path: '/pipelines', icon: GitBranch, label: 'Pipelines' },
    { path: '/teams', icon: Users, label: 'Teams' },
    { path: '/vault', icon: KeyRound, label: 'Vault' },
    { path: '/approvals', icon: ShieldCheck, label: 'Approvals' },
    { path: '/audit', icon: Shield, label: 'Audit Log' },
    { path: '/profiles', icon: Bot, label: 'Profiles' },
    { path: '/favorites', icon: Star, label: 'Favorites' },
    { path: '/health', icon: HeartPulse, label: 'Health' },
    { path: '/tags', icon: Tag, label: 'Tags' },
    { path: '/env', icon: Variable, label: 'Env Vars' },
    { path: '/timeline', icon: Activity, label: 'Timeline' },
    { path: '/backups', icon: HardDrive, label: 'Backups' },
    { path: '/preferences', icon: SlidersHorizontal, label: 'Preferences' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-bg-primary">
      <aside className="w-56 border-r border-border bg-bg-secondary flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <Cpu className="w-6 h-6 text-accent" />
              <span className="text-lg font-bold text-text-primary">AutoPilot</span>
            </Link>
            <NotificationBell />
          </div>
        </div>
        <div className="mx-2 mt-2 mb-1">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-bg-primary text-text-muted text-xs hover:border-accent/40 transition-colors"
          >
            <Search className="w-3 h-3" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-[10px] bg-bg-tertiary px-1 py-0.5 rounded border border-border">⌘K</kbd>
          </button>
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
        <div className="p-4 border-t border-border space-y-2">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted truncate">{user.display_name || user.email}</span>
              <button onClick={handleLogout} className="text-text-muted hover:text-text-primary">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-text-muted">AutoPilot v0.6.0</p>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
