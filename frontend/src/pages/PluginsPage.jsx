import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Puzzle, RefreshCw, Code, FileJson } from 'lucide-react';

const ICON_MAP = {
  calculator: Code,
  json_transform: FileJson,
};

export default function PluginsPage() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      const data = await api.getPlugins();
      setPlugins(data);
    } catch {}
    setLoading(false);
  };

  const handleReload = async () => {
    setReloading(true);
    try {
      await api.reloadPlugins();
      await loadPlugins();
    } catch {}
    setReloading(false);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Plugins</h2>
          <p className="text-sm text-text-muted mt-1">
            Drop a Python file into <code className="bg-bg-tertiary px-1 rounded text-xs">backend/plugins/</code> to add custom tools.
          </p>
        </div>
        <button
          onClick={handleReload}
          disabled={reloading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${reloading ? 'animate-spin' : ''}`} />
          Reload
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 rounded-lg border border-border bg-bg-secondary">
              <div className="skeleton h-4 w-1/3 mb-2" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Puzzle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No plugins loaded.</p>
          <p className="text-xs mt-1">Add a .py file with a Tool subclass to backend/plugins/</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map((plugin) => {
            const Icon = ICON_MAP[plugin.name] || Puzzle;
            return (
              <div key={plugin.name} className="p-4 rounded-lg border border-border bg-bg-secondary">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{plugin.name}</h3>
                    <span className="text-xs text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">active</span>
                  </div>
                </div>
                <p className="text-sm text-text-secondary">{plugin.description}</p>
                {plugin.input_schema?.properties && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.keys(plugin.input_schema.properties).map((param) => (
                      <span key={param} className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded">
                        {param}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
