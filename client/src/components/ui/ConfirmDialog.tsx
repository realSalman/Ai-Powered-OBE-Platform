"use client";

import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to perform this action? This cannot be undone.",
  confirmText = "CONFIRM",
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-zinc-950/70 backdrop-blur-xs">
      <div className="w-full max-w-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="space-y-2">
          <h3 className="text-sm font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
            {title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 font-mono text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-50 cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 border border-red-500 dark:border-red-950 bg-red-600 text-white dark:bg-red-950 dark:text-red-300 font-mono text-xs hover:bg-red-700 dark:hover:bg-red-900 disabled:opacity-50 cursor-pointer font-bold"
          >
            {loading ? "PROCESSING..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
