"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IAIMessage } from '@/types/api';

interface AIChatMessageProps {
  message: IAIMessage;
}

export default function AIChatMessage({ message }: AIChatMessageProps) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const isSystem = message.role === 'system';

  if (isSystem) return null;

  if (isTool) {
    // Usually tool results are shown as a collapsible detail box or ignored in main bubble flow
    return (
      <div className="px-4 py-1.5 border-l-2 border-zinc-350 dark:border-zinc-700 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono bg-zinc-50/50 dark:bg-zinc-950/20 my-1 truncate">
        ⚡ EXECUTED: {message.name}
      </div>
    );
  }

  // Custom markdown components to align with design specs
  const markdownComponents = {
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-3 border border-zinc-200 dark:border-zinc-850">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-[11px] text-left border-collapse" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: any) => (
      <thead className="bg-zinc-50 dark:bg-zinc-950/60 font-bold uppercase tracking-wider text-[9px] border-b border-zinc-200 dark:border-zinc-800" {...props}>
        {children}
      </thead>
    ),
    th: ({ children, ...props }: any) => (
      <th className="px-3 py-2 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider font-mono text-[9px]" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-850 font-mono text-[10px] text-zinc-800 dark:text-zinc-200" {...props}>
        {children}
      </td>
    ),
    p: ({ children, ...props }: any) => <p className="mb-2.5 last:mb-0 leading-relaxed font-sans text-xs" {...props}>{children}</p>,
    ul: ({ children, ...props }: any) => <ul className="list-disc pl-4 mb-2.5 space-y-1 font-sans text-xs" {...props}>{children}</ul>,
    ol: ({ children, ...props }: any) => <ol className="list-decimal pl-4 mb-2.5 space-y-1 font-sans text-xs" {...props}>{children}</ol>,
    li: ({ children, ...props }: any) => <li className="mb-0.5" {...props}>{children}</li>,
    h1: ({ children, ...props }: any) => <h1 className="text-[12px] font-bold uppercase tracking-wider my-3 text-zinc-900 dark:text-zinc-100 font-mono border-b border-zinc-200 dark:border-zinc-800 pb-1" {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 className="text-[11px] font-bold uppercase tracking-wider my-2.5 text-zinc-850 dark:text-zinc-200 font-mono" {...props}>{children}</h2>,
    h3: ({ children, ...props }: any) => <h3 className="text-[10px] font-bold uppercase tracking-wide my-2 text-zinc-700 dark:text-zinc-300 font-mono" {...props}>{children}</h3>,
    code: ({ children, ...props }: any) => (
      <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-950 font-mono text-[10px] border border-zinc-200 dark:border-zinc-850 text-zinc-800 dark:text-zinc-200 rounded-none" {...props}>
        {children}
      </code>
    ),
    pre: ({ children, ...props }: any) => (
      <pre className="p-3 bg-zinc-50 dark:bg-zinc-950/60 font-mono text-[10px] border border-zinc-200 dark:border-zinc-850 text-zinc-800 dark:text-zinc-200 overflow-x-auto my-3 whitespace-pre-wrap leading-normal" {...props}>
        {children}
      </pre>
    ),
    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-2 border-zinc-400 dark:border-zinc-700 pl-3 italic text-zinc-500 dark:text-zinc-400 my-2 text-xs" {...props}>
        {children}
      </blockquote>
    )
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border ${isUser
        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 border-zinc-200 dark:border-zinc-700 rounded-none'
        : 'bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 rounded-none'
        }`}>


        {isUser ? (
          <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-800 dark:text-zinc-100">{message.content}</p>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
              {message.content}
            </ReactMarkdown>

            {message.tool_calls && message.tool_calls.length > 0 && !message.content && (
              <div className="flex items-center gap-2 text-zinc-400 font-mono text-[10px] italic py-1 animate-pulse">
                <span>⚒ Calling analysis tools...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
