import { useState } from 'react';
import {
  Download, Share2, FileText, Table, Link, Loader2, Copy, Trash2, ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';

export default function ReportExport({ taskId }) {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareForm, setShareForm] = useState({ title: '', format: 'html', expires_hours: 168 });
  const [creating, setCreating] = useState(false);
  const [shareResult, setShareResult] = useState(null);

  const loadShares = async () => {
    setLoading(true);
    try {
      const data = await api.getSharedReports(taskId);
      setShares(data);
    } catch {}
    setLoading(false);
  };

  const handleExportHtml = () => {
    window.open(api.exportReportHtml(taskId), '_blank');
  };

  const handleExportCsv = () => {
    window.open(api.exportReportCsv(taskId), '_blank');
  };

  const handleCreateShare = async () => {
    if (!shareForm.title) return;
    setCreating(true);
    try {
      const result = await api.createSharedReport({ task_id: taskId, ...shareForm });
      setShareResult(result);
      loadShares();
    } catch {}
    setCreating(false);
  };

  const handleDeleteShare = async (id) => {
    await api.deleteSharedReport(id);
    loadShares();
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}/api/reports/shared/${token}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Download className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-medium text-text-primary">Export & Share</h3>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleExportHtml}
          className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary text-text-primary rounded-lg text-sm hover:bg-border"
        >
          <FileText className="w-4 h-4" /> Export HTML
        </button>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary text-text-primary rounded-lg text-sm hover:bg-border"
        >
          <Table className="w-4 h-4" /> Export CSV
        </button>
        <button
          onClick={() => { setShowShare(!showShare); if (!showShare) loadShares(); }}
          className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
        >
          <Share2 className="w-4 h-4" /> Share Link
        </button>
      </div>

      {showShare && (
        <div className="border border-border rounded-xl bg-bg-secondary p-4 space-y-3">
          <input
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
            placeholder="Report title"
            value={shareForm.title}
            onChange={(e) => setShareForm({ ...shareForm, title: e.target.value })}
          />
          <div className="flex gap-2">
            <select
              className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
              value={shareForm.format}
              onChange={(e) => setShareForm({ ...shareForm, format: e.target.value })}
            >
              <option value="html">HTML Report</option>
              <option value="csv">CSV Data</option>
            </select>
            <select
              className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
              value={shareForm.expires_hours}
              onChange={(e) => setShareForm({ ...shareForm, expires_hours: parseInt(e.target.value) })}
            >
              <option value={24}>Expires in 24h</option>
              <option value={168}>Expires in 7 days</option>
              <option value={720}>Expires in 30 days</option>
              <option value={8760}>Expires in 1 year</option>
            </select>
          </div>
          <button
            onClick={handleCreateShare}
            disabled={creating}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
            Create Shareable Link
          </button>

          {shareResult && (
            <div className="bg-bg-primary rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-mono text-accent truncate">
                {window.location.origin}/api/reports/shared/{shareResult.share_token}
              </span>
              <button onClick={() => copyLink(shareResult.share_token)} className="text-text-muted hover:text-text-primary ml-2">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          )}

          {shares.length > 0 && (
            <div className="space-y-1 mt-2">
              <p className="text-xs text-text-muted font-medium">Existing Links</p>
              {shares.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-bg-primary rounded px-2 py-1">
                  <div className="flex items-center gap-2">
                    <Link className="w-3 h-3 text-text-muted" />
                    <span className="text-xs text-text-primary">{s.title}</span>
                    <span className="text-[10px] text-text-muted">{s.format} · {s.view_count} views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => copyLink(s.share_token)} className="text-text-muted hover:text-text-primary">
                      <Copy className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDeleteShare(s.id)} className="text-text-muted hover:text-red">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
