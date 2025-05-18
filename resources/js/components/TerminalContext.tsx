import React, { createContext, useContext, useState, useCallback } from 'react';
import { Terminal, TerminalMessage } from './Terminal';

interface TerminalContextType {
  addMessage: (content: string, type: TerminalMessage['type']) => void;
  clearMessages: () => void;
  messages: TerminalMessage[];
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export const useTerminal = () => {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
};

let messageId = 0;

export const TerminalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<TerminalMessage[]>([]);

  const addMessage = useCallback((content: string, type: TerminalMessage['type'] = 'info') => {
    const newMessage: TerminalMessage = {
      id: `msg-${messageId++}`,
      content,
      type,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <TerminalContext.Provider value={{ addMessage, clearMessages, messages }}>
      <Terminal messages={messages} />
      {children}
    </TerminalContext.Provider>
  );
}; 