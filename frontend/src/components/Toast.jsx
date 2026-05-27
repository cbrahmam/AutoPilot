import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: 'border-accent/40 bg-accent/10 text-accent',
  error: 'border-red/40 bg-red/10 text-red',
  warning: 'border-amber/40 bg-amber/10 text-amber',
  info: 'border-blue/40 bg-blue/10 text-blue',
};

let _addToast = () => {};

export function toast(message, type = 'info') {
  _addToast({ message, type, id: Date.now() });
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  _addToast = useCallback((t) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 4000);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        const color = COLORS[t.type] || COLORS.info;
        return (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm animate-fade-in ${color}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="opacity-60 hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
