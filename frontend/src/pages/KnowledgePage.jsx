import { useEffect, useState, useRef } from 'react';
import {
  BookOpen, Upload, Trash2, Search, FileText, Plus, RefreshCw, Loader2, X,
} from 'lucide-react';
import { api } from '../api/client';

export default function KnowledgePage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showTextForm, setShowTextForm] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { loadDocs(); }, []);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await api.getKnowledgeDocs();
      setDocs(data);
    } catch {}
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadKnowledgeFile(file);
      loadDocs();
    } catch {}
    setUploading(false);
    setShowUpload(false);
  };

  const handleTextUpload = async () => {
    if (!textTitle || !textContent) return;
    setUploading(true);
    try {
      await api.uploadKnowledgeText(textTitle, textContent);
      setTextTitle('');
      setTextContent('');
      setShowTextForm(false);
      loadDocs();
    } catch {}
    setUploading(false);
  };

  const handleDelete = async (id) => {
    await api.deleteKnowledgeDoc(id);
    loadDocs();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await api.searchKnowledge(searchQuery);
      setSearchResults(data.results);
    } catch {}
    setSearching(false);
  };

  const handleReindex = async () => {
    await api.reindexKnowledge();
    loadDocs();
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold text-text-primary">Knowledge Base</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReindex}
              className="flex items-center gap-2 px-3 py-2 bg-bg-secondary text-text-secondary rounded-lg text-sm hover:bg-bg-tertiary"
            >
              <RefreshCw className="w-4 h-4" /> Reindex
            </button>
            <button
              onClick={() => { setShowTextForm(!showTextForm); setShowUpload(false); }}
              className="flex items-center gap-2 px-3 py-2 bg-bg-secondary text-text-secondary rounded-lg text-sm hover:bg-bg-tertiary"
            >
              <Plus className="w-4 h-4" /> Add Text
            </button>
            <button
              onClick={() => { setShowUpload(!showUpload); setShowTextForm(false); }}
              className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
            >
              <Upload className="w-4 h-4" /> Upload File
            </button>
          </div>
        </div>

        <p className="text-text-secondary text-sm mb-6">
          Upload documents that agents can search during task execution. Supports text, markdown, code, and CSV files.
        </p>

        {showUpload && (
          <div className="border border-border rounded-xl bg-bg-secondary p-4 mb-4">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.py,.js,.json,.html,.xml,.yaml,.yml,.log,.tsv,.rst"
              onChange={handleFileUpload}
              className="text-sm text-text-primary"
            />
            {uploading && <p className="text-xs text-text-muted mt-2">Uploading and indexing...</p>}
          </div>
        )}

        {showTextForm && (
          <div className="border border-border rounded-xl bg-bg-secondary p-4 mb-4 space-y-3">
            <input
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
              placeholder="Document title"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
            />
            <textarea
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
              placeholder="Paste your text content here..."
              rows={6}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={handleTextUpload} disabled={uploading} className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90">
                {uploading ? 'Indexing...' : 'Add Document'}
              </button>
              <button onClick={() => setShowTextForm(false)} className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <input
            className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
          {searchResults !== null && (
            <button
              onClick={() => setSearchResults(null)}
              className="flex items-center gap-2 px-3 py-2 bg-bg-secondary text-text-secondary rounded-lg text-sm"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {searchResults !== null && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-text-primary mb-3">
              Search Results ({searchResults.length})
            </h2>
            {searchResults.length === 0 ? (
              <p className="text-text-muted text-sm">No results found.</p>
            ) : (
              <div className="space-y-3">
                {searchResults.map((r, i) => (
                  <div key={i} className="border border-border rounded-xl bg-bg-secondary p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium text-text-primary">{r.filename}</span>
                      </div>
                      <span className="text-xs text-text-muted">Score: {r.score}</span>
                    </div>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap line-clamp-4">{r.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <h2 className="text-sm font-medium text-text-primary mb-3">
          Documents ({docs.length})
        </h2>
        {docs.length === 0 ? (
          <p className="text-text-muted text-center py-12">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="border border-border rounded-lg bg-bg-secondary p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-text-muted" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{doc.filename}</p>
                    <p className="text-xs text-text-muted">
                      {formatSize(doc.size_bytes)} · {doc.chunk_count} chunks · {doc.created_at?.slice(0, 10)}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(doc.id)} className="text-text-muted hover:text-red">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
