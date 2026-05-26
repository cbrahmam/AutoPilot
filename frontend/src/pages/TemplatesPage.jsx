import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Code, BarChart3, Pen, TrendingUp, LayoutTemplate } from 'lucide-react';
import { api } from '../api/client';

const CATEGORY_ICONS = {
  research: Search,
  coding: Code,
  analysis: BarChart3,
  writing: Pen,
};

const CATEGORY_COLORS = {
  research: 'text-blue',
  coding: 'text-accent',
  analysis: 'text-purple',
  writing: 'text-yellow',
};

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [variables, setVariables] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTemplates().then(setTemplates).catch(() => {});
  }, []);

  const handleSelect = (template) => {
    setSelected(template);
    const vars = {};
    template.variables.forEach((v) => { vars[v.name] = ''; });
    setVariables(vars);
    setError(null);
  };

  const handleUse = async () => {
    if (!selected) return;
    const missing = selected.variables.find((v) => !variables[v.name]?.trim());
    if (missing) {
      setError(`Please fill in: ${missing.label}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.useTemplate(selected.id, variables);
      await api.executeTask(result.id);
      navigate(`/task/${result.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <LayoutTemplate className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold text-text-primary">Templates</h1>
        </div>
        <p className="text-text-secondary mb-8">
          Pre-built workflows with optimized agent plans. Pick a template, fill in the details, and run.
        </p>

        {!selected ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => {
              const Icon = CATEGORY_ICONS[t.category] || TrendingUp;
              const color = CATEGORY_COLORS[t.category] || 'text-text-secondary';
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  className="text-left p-5 rounded-xl border border-border bg-bg-secondary hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <span className="text-xs uppercase tracking-wider text-text-muted">{t.category}</span>
                  </div>
                  <h3 className="text-base font-semibold text-text-primary mb-1">{t.name}</h3>
                  <p className="text-sm text-text-secondary">{t.description}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="border border-border rounded-xl bg-bg-secondary p-6">
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-text-muted hover:text-text-secondary mb-4"
            >
              &larr; Back to templates
            </button>
            <h2 className="text-lg font-semibold text-text-primary mb-1">{selected.name}</h2>
            <p className="text-sm text-text-secondary mb-6">{selected.description}</p>

            <div className="space-y-4 mb-6">
              {selected.variables.map((v) => (
                <div key={v.name}>
                  <label className="block text-sm text-text-secondary mb-1">{v.label}</label>
                  <input
                    type="text"
                    value={variables[v.name] || ''}
                    onChange={(e) => setVariables({ ...variables, [v.name]: e.target.value })}
                    placeholder={v.placeholder}
                    className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
                    onKeyDown={(e) => e.key === 'Enter' && handleUse()}
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-red mb-4">{error}</p>}

            <button
              onClick={handleUse}
              disabled={loading}
              className="px-5 py-2 rounded-md bg-accent text-bg-primary text-sm font-medium hover:bg-accent-bright transition-colors disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Run Template'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
