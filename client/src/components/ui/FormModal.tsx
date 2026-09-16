"use client";

import React from 'react';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitText?: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = "SAVE",
  loading = false,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const content = (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-sm font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
          {title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-mono text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 cursor-pointer"
        >
          [CLOSE]
        </button>
      </div>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {children}
      </div>

      {onSubmit && (
        <div className="flex gap-3 justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 font-mono text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-50 cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer font-bold"
          >
            {loading ? "SAVING..." : submitText.toUpperCase()}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-zinc-950/70 backdrop-blur-xs overflow-y-auto">
      <div className={`w-full ${sizeClasses[size]} border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none shadow-none my-8 animate-in fade-in zoom-in-95 duration-150`}>
        {onSubmit ? (
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(e); }}>
            {content}
          </form>
        ) : (
          <div>{content}</div>
        )}
      </div>
    </div>
  );
};
