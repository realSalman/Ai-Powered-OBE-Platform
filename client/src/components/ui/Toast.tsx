"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextType {
  showToast: (message: string, type: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`cursor-pointer px-4 py-3 border font-mono text-xs shadow-none flex justify-between items-center transition-all animate-in fade-in slide-in-from-bottom-5 duration-200 ${
              toast.type === 'success'
                ? 'bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-50'
                : 'bg-red-50 dark:bg-red-950/20 border-red-500 dark:border-red-900/50 text-red-700 dark:text-red-400'
            }`}
          >
            <span>{toast.message.toUpperCase()}</span>
            <button className="ml-4 text-[9px] text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">
              [X]
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
