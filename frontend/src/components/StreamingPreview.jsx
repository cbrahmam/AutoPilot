import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Eye, EyeOff } from 'lucide-react';

export default function StreamingPreview({ events, finalResult }) {
  const [preview, setPreview] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    if (finalResult) {
      setPreview(finalResult);
      return;
    }

    const chunks = [];
    for (const event of events) {
      if (event.type === 'thinking' && event.data?.text) {
        const text = event.data.text;
        if (text.length > 100 && !text.startsWith('I ') && !text.startsWith('Let me') && !text.startsWith('Now')) {
          chunks.push(text);
        }
      }
    }

    if (chunks.length > 0) {
      setPreview(chunks[chunks.length - 1]);
    }
  }, [events, finalResult]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [preview]);

  if (!preview) return null;

  return (
    <div className="border border-border rounded-lg bg-bg-secondary overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-tertiary">
        <span className="text-xs font-medium text-text-secondary">
          {finalResult ? 'Final Result' : 'Live Preview'}
        </span>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="text-text-muted hover:text-text-primary"
        >
          {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>

      {showPreview && (
        <div
          ref={containerRef}
          className="p-4 max-h-96 overflow-y-auto text-sm text-text-secondary prose prose-invert prose-sm max-w-none"
        >
          <ReactMarkdown>{preview}</ReactMarkdown>
          {!finalResult && (
            <span className="inline-block w-2 h-4 bg-accent/50 animate-pulse ml-0.5" />
          )}
        </div>
      )}
    </div>
  );
}
