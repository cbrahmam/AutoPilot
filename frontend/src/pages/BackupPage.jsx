import { useEffect, useState } from 'react';
import {
  HardDrive, Plus, Download, RotateCcw, Trash2, Loader2, AlertTriangle, Database,
} from 'lucide-react';
import { api } from '../api/client';

export default function BackupPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setBackups(await api.getBackups()); } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.createBackup();
      load();
    } catch {}
    setCreating(false);
  };

  const handleDownload = (id) => {
    window.open(api.downloadBackup(id), '_blank');
  };

  const handleRestore = async (id) => {
    setRestoring(id);
    try {
      await api.restoreBackup(id);
      setConfirmRestore(null);
    } catch {}
    setRestoring(null);
  };

  const handleDelete = async (id) => {
    await api.deleteBackup(id);
    load();
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Backup & Restore</h1>
            <p className="text-sm text-text-muted">Create and manage database backups</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 disabled:opacity-50"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create Backup
        </button>
      </div>

      {/* Warning */}
      <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-amber-400 font-medium">Restore Warning</p>
          <p className="text-xs text-text-muted mt-0.5">Restoring a backup will overwrite all current data. Make sure to create a backup of current data before restoring.</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-text-muted py-8">Loading backups...</p>
      ) : backups.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-xl bg-bg-secondary">
          <HardDrive className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No backups yet</p>
          <p className="text-text-muted text-xs mt-1">Create your first backup to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {backups.map((backup) => (
            <div key={backup.id} className="border border-border rounded-xl bg-bg-secondary p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-text-primary font-mono">{backup.filename}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-text-muted">{formatSize(backup.size_bytes)}</span>
                      <span className="text-xs text-text-muted">{formatTime(backup.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(backup.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-bg-tertiary text-text-primary rounded-lg text-xs hover:bg-border"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  {confirmRestore === backup.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRestore(backup.id)}
                        disabled={restoring === backup.id}
                        className="px-2.5 py-1.5 bg-amber-500 text-white rounded-lg text-xs hover:bg-amber-600 disabled:opacity-50"
                      >
                        {restoring === backup.id ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Confirm'}
                      </button>
                      <button onClick={() => setConfirmRestore(null)} className="px-2.5 py-1.5 bg-bg-tertiary text-text-primary rounded-lg text-xs">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRestore(backup.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-bg-tertiary text-text-primary rounded-lg text-xs hover:bg-border"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(backup.id)}
                    className="p-1.5 text-text-muted hover:text-red rounded hover:bg-bg-tertiary"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {backup.row_counts && typeof backup.row_counts === 'object' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(backup.row_counts)
                    .filter(([, count]) => count > 0)
                    .slice(0, 12)
                    .map(([table, count]) => (
                      <span key={table} className="text-[10px] bg-bg-primary px-2 py-0.5 rounded text-text-muted">
                        {table}: <span className="text-text-secondary">{count}</span>
                      </span>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
