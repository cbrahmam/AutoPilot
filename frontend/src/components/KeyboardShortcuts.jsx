import { useEffect, useState } from 'react';

const SHORTCUTS = [
  { keys: ['Cmd', 'Enter'], description: 'Submit task' },
  { keys: ['Cmd', 'P'], description: 'Pause execution' },
  { keys: ['Cmd', 'R'], description: 'Resume execution' },
  { keys: ['Escape'], description: 'Cancel / Close modal' },
  { keys: ['?'], description: 'Show shortcuts' },
];

export function useKeyboardShortcuts({ onPause, onResume, onCancel }) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          e.target.blur();
          return;
        }
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      if (e.key === 'Escape') {
        if (showHelp) {
          setShowHelp(false);
        } else if (onCancel) {
          onCancel();
        }
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'p') {
          e.preventDefault();
          onPause?.();
        } else if (e.key === 'r') {
          e.preventDefault();
          onResume?.();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onPause, onResume, onCancel, showHelp]);

  return { showHelp, setShowHelp };
}

export default function ShortcutsModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-bg-secondary border border-border rounded-xl p-6 w-80 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-text-primary mb-4">Keyboard Shortcuts</h3>
        <div className="space-y-3">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">{description}</span>
              <div className="flex gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-1.5 py-0.5 rounded bg-bg-tertiary border border-border text-xs text-text-primary font-mono"
                  >
                    {k === 'Cmd' ? '⌘' : k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
