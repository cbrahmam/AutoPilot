import { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  FileText, FolderOpen, Download, ChevronRight, RefreshCw, File, Table2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const EXT_LANG = {
  py: 'python', js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx',
  sh: 'bash', json: 'json', css: 'css', html: 'html', sql: 'sql',
  yaml: 'yaml', yml: 'yaml', md: 'markdown', csv: 'csv', txt: 'text',
};

export default function WorkspaceViewer({ taskId }) {
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadFiles = async () => {
    try {
      const data = await api.getWorkspace(taskId);
      setFiles(data.files || []);
    } catch {}
  };

  useEffect(() => {
    loadFiles();
    const interval = setInterval(loadFiles, 5000);
    return () => clearInterval(interval);
  }, [taskId]);

  const handleSelect = async (filePath) => {
    setSelected(filePath);
    setLoading(true);
    try {
      const data = await api.getWorkspaceFile(taskId, filePath);
      setContent(data);
    } catch {
      setContent({ path: filePath, content: '(unable to load file)', size: 0 });
    }
    setLoading(false);
  };

  const ext = selected?.split('.').pop()?.toLowerCase() || '';
  const lang = EXT_LANG[ext] || 'text';

  return (
    <div className="flex h-full border-t border-border">
      {/* File tree */}
      <div className="w-56 border-r border-border bg-bg-secondary overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Files
          </span>
          <div className="flex gap-1">
            <button onClick={loadFiles} className="text-text-muted hover:text-text-secondary">
              <RefreshCw className="w-3 h-3" />
            </button>
            <a
              href={`/api/tasks/${taskId}/workspace/download`}
              className="text-text-muted hover:text-text-secondary"
              title="Download all"
            >
              <Download className="w-3 h-3" />
            </a>
          </div>
        </div>
        {files.length === 0 ? (
          <p className="px-3 py-4 text-xs text-text-muted">No files yet</p>
        ) : (
          <div className="py-1">
            {files.map((f) => (
              <button
                key={f.path}
                onClick={() => handleSelect(f.path)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                  selected === f.path
                    ? 'bg-bg-tertiary text-text-primary'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
              >
                <FileText className="w-3 h-3 shrink-0 text-blue" />
                <span className="truncate">{f.path}</span>
                <span className="ml-auto text-text-muted shrink-0">{formatSize(f.size)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-auto bg-bg-primary">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            <FolderOpen className="w-5 h-5 mr-2" />
            Select a file to preview
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            Loading...
          </div>
        ) : content ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4 text-blue" />
                <span className="text-sm font-medium text-text-primary">{content.path}</span>
                <span className="text-xs text-text-muted">{formatSize(content.size)}</span>
              </div>
              <a
                href={`/api/tasks/${taskId}/workspace/${content.path}`}
                download
                className="text-xs text-text-muted hover:text-blue flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download
              </a>
            </div>
            {renderPreview(content.content, lang, ext)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderPreview(text, lang, ext) {
  if (ext === 'md') {
    return (
      <div className="prose prose-invert prose-sm max-w-none text-text-secondary">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }

  if (ext === 'csv') {
    return <CsvTable text={text} />;
  }

  if (ext === 'json') {
    try {
      const parsed = JSON.parse(text);
      return (
        <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap bg-bg-secondary rounded-lg p-4 overflow-x-auto">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {}
  }

  return (
    <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap bg-bg-secondary rounded-lg p-4 overflow-x-auto">
      {text}
    </pre>
  );
}

function CsvTable({ text }) {
  const lines = text.trim().split('\n').slice(0, 100);
  if (lines.length === 0) return <p className="text-xs text-text-muted">Empty file</p>;

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) =>
    line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-border">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left text-text-secondary font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border/50 hover:bg-bg-secondary">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-text-secondary">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {lines.length >= 100 && (
        <p className="text-xs text-text-muted mt-2 px-3">Showing first 100 rows</p>
      )}
    </div>
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
