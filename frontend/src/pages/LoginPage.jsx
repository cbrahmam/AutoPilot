import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, LogIn, UserPlus } from 'lucide-react';

export default function LoginPage({ onAuth }) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister
      ? { email, password, display_name: displayName }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Something went wrong');
        setLoading(false);
        return;
      }

      localStorage.setItem('autopilot_token', data.token);
      localStorage.setItem('autopilot_user', JSON.stringify(data.user));
      if (onAuth) onAuth(data.user);
      navigate('/');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Cpu className="w-8 h-8 text-accent" />
          <span className="text-2xl font-bold text-text-primary">AutoPilot</span>
        </div>

        <div className="bg-bg-secondary border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {isRegister ? 'Create Account' : 'Sign In'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none"
            />

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {loading ? 'Loading...' : isRegister ? 'Register' : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-text-muted text-center mt-4">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-accent hover:underline"
            >
              {isRegister ? 'Sign in' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
