import { useEffect, useRef, useCallback } from 'react';
import { useTaskStore } from '../store/taskStore';

export function useWebSocket(taskId) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const handleWSEvent = useTaskStore((s) => s.handleWSEvent);

  const connect = useCallback(() => {
    if (!taskId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/tasks/${taskId}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      clearTimeout(reconnectTimer.current);
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        handleWSEvent(event);
      } catch {}
    };

    ws.onclose = () => {
      reconnectTimer.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [taskId, handleWSEvent]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { sendMessage };
}
