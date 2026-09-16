"use client";

import React from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, children, hint }) => {
  return (
    <div className="space-y-1.5 w-full">
      <label className="block text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">
        {label.toUpperCase()}
      </label>
      <div className="relative">
        {children}
      </div>
      {hint && (
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-light leading-none">
          {hint}
        </p>
      )}
      {error && (
        <p className="text-[10px] text-red-600 dark:text-red-400 font-mono font-semibold uppercase tracking-tight">
          * {error}
        </p>
      )}
    </div>
  );
};
