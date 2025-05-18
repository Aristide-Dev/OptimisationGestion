import React, { useEffect, useRef } from 'react';

export interface TerminalMessage {
  id: string;
  content: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: Date;
}

interface TerminalProps {
  messages: TerminalMessage[];
  maxMessages?: number;
}

export const Terminal: React.FC<TerminalProps> = ({ 
  messages = [], 
  maxMessages = 5 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  const getTypeColor = (type: TerminalMessage['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="w-full fixed top-0 left-0 z-50 px-4 py-1 bg-slate-900 text-white shadow-md border-b border-slate-700">
      <div 
        ref={terminalRef}
        className="max-h-[100px] overflow-y-auto font-mono text-sm"
      >
        {messages.slice(-maxMessages).map((msg) => (
          <div key={msg.id} className="py-1 border-b border-slate-800 last:border-b-0">
            <span className="text-slate-400 text-xs">[{formatTime(msg.timestamp)}]</span>{' '}
            <span className={getTypeColor(msg.type)}>{msg.content}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="py-1 text-slate-500 italic text-xs">Terminal prêt...</div>
        )}
      </div>
    </div>
  );
}; 