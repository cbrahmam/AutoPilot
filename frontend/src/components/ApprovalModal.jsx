import { useState } from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';

export default function ApprovalModal({ request, onRespond }) {
  const [response, setResponse] = useState('');

  if (!request) return null;

  const handleApprove = () => {
    const selected = response || (request.options?.length ? request.options[0] : 'approved');
    onRespond(request.request_id, true, selected);
  };

  const handleReject = () => {
    onRespond(request.request_id, false, 'rejected');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-secondary border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-amber" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Agent needs your input</h3>
            <p className="text-xs text-text-muted">Waiting for your response...</p>
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-4">{request.question}</p>

        {request.options?.length > 0 ? (
          <div className="space-y-2 mb-4">
            {request.options.map((opt) => (
              <button
                key={opt}
                onClick={() => setResponse(opt)}
                className={`w-full text-left px-3 py-2 rounded-md border text-sm transition-colors ${
                  response === opt
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your response..."
            rows={3}
            className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none mb-4 resize-none"
          />
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={handleReject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-text-secondary hover:text-red hover:border-red transition-colors"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
          <button
            onClick={handleApprove}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-accent text-bg-primary text-sm font-medium hover:bg-accent-bright transition-colors"
          >
            <Check className="w-4 h-4" />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
