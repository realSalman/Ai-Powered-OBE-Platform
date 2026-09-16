"use client";

import React, { useState } from 'react';
import { useAI } from '@/context/AIContext';
import { apiPost, getErrorMessage } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIInsightCardsProps {
  scopeId: string;
  scopeType: 'offering' | 'batch' | 'department' | 'student';
  semesterId?: string;
}

interface InsightCardConfig {
  type: 'root-cause' | 'at-risk' | 'improvement' | 'career-advisory' | 'performance';
  title: string;
  description: string;
  icon: string;
}

export default function AIInsightCards({ scopeId, scopeType, semesterId }: AIInsightCardsProps) {
  const { activeRole, hasApiKey, setIsDrawerOpen, sendMessage, createNewChat } = useAI();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [activeCardType, setActiveCardType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Define which cards appear for which roles
  const getCardsForRole = (): InsightCardConfig[] => {
    switch (activeRole) {
      case 'student':
        return [
          {
            type: 'performance',
            title: 'Academic Performance Analysis',
            description: 'Evaluate your exam scores, overall progress, and attainment targets.',
            icon: '📊'
          },
          {
            type: 'improvement',
            title: 'Study & Course Outcomes Plan',
            description: 'Receive recommended strategies to strengthen your weak Course Outcomes.',
            icon: '✏️'
          },
          {
            type: 'career-advisory',
            title: 'Career & Strengths Guidance',
            description: 'Align your Program Outcome strengths with job profiles and certifications.',
            icon: '💼'
          }
        ];
      case 'faculty':
        return [
          {
            type: 'at-risk',
            title: 'Identify At-Risk Students',
            description: 'Locate students performing below passing criteria and suggest interventions.',
            icon: '⚠️'
          },
          {
            type: 'root-cause',
            title: 'CO Attainment Root-Cause',
            description: 'Analyze low-attainment outcomes and map them to Bloom Taxonomy levels.',
            icon: '🔍'
          },
          {
            type: 'improvement',
            title: 'Course Improvement Recommendations',
            description: 'Get curriculum and pedagogical adjustments for the entire class.',
            icon: '📈'
          }
        ];
      case 'hod':
      case 'supervisor':
      case 'admin':
      case 'superadmin':
        return [
          {
            type: 'root-cause',
            title: 'Systemic Root-Cause Report',
            description: 'Assess course-wide outcome trends and pedagogical weak points.',
            icon: '🔍'
          },
          {
            type: 'improvement',
            title: 'Strategic Improvement Plan',
            description: 'Produce a department-wide or batch-wide learning improvement outline.',
            icon: '🏛️'
          }
        ];
      default:
        return [];
    }
  };

  const cards = getCardsForRole().filter(card => {
    // Filter cards by matching scope types
    if (card.type === 'at-risk' || card.type === 'root-cause') {
      return scopeType === 'offering' || scopeType === 'department' || scopeType === 'batch';
    }
    if (card.type === 'career-advisory' || card.type === 'performance') {
      return scopeType === 'student';
    }
    if (card.type === 'improvement') {
      return scopeType === 'offering' || scopeType === 'student' || scopeType === 'department' || scopeType === 'batch';
    }
    return true;
  });

  const handleCardClick = async (card: InsightCardConfig) => {
    if (!hasApiKey) {
      setError('Please set up your OpenRouter API Key before generating insights.');
      setIsDrawerOpen(true); // Open drawer to show key configuration
      return;
    }

    if (!scopeId) {
      setError('Invalid scope. Please select a course offering or student record first.');
      return;
    }

    setLoading(true);
    setReport(null);
    setActiveCardType(card.type);
    setError(null);

    try {
      const response = await apiPost<{ content: string; cached: boolean }>('/ai/analyze', {
        type: card.type,
        scopeId,
        scopeType,
        role: activeRole,
        semesterId
      });
      setReport(response.data.content);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to generate quick analysis report'));
    } finally {
      setLoading(false);
    }
  };

  const handleContinueInChat = async () => {
    if (!report) return;
    createNewChat();
    setIsDrawerOpen(true);
    await sendMessage(`I generated this ${activeCardType} report:\n\n${report.slice(0, 1000)}...\n\nLet's analyze it further.`);
  };

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
    code: ({ children, ...props }: any) => (
      <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-950 font-mono text-[10px] border border-zinc-200 dark:border-zinc-850 text-zinc-800 dark:text-zinc-200 rounded-none" {...props}>
        {children}
      </code>
    )
  };

  if (cards.length === 0) return null;

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-2 border-b border-zinc-250 dark:border-zinc-800 pb-2">
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => {
          const isCurrent = activeCardType === card.type;
          return (
            <button
              key={card.type}
              onClick={() => handleCardClick(card)}
              disabled={loading}
              className={`text-left p-4 border transition-all duration-150 flex flex-col justify-between h-32 rounded-none group cursor-pointer ${isCurrent
                ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-55 dark:bg-zinc-900/60'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-700'
                }`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg">{card.icon}</span>
                  <span className="font-mono text-[8px] font-bold border border-zinc-200 dark:border-zinc-800 px-1 py-0.5 uppercase tracking-widest text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-350">
                    Run
                  </span>
                </div>
                <h3 className="font-mono font-bold text-xs uppercase tracking-wide text-zinc-800 dark:text-zinc-200 leading-tight">
                  {card.title}
                </h3>
                <p className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400 leading-normal line-clamp-2">
                  {card.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/10 text-red-700 dark:text-red-400 font-mono text-[10px] uppercase font-bold">
          * Error: {error}
        </div>
      )}

      {loading && (
        <div className="p-8 border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 flex flex-col items-center justify-center space-y-3 font-mono text-[10px]">
          <span className="animate-pulse tracking-widest uppercase text-zinc-550 dark:text-zinc-400">
            📊 Gathering class data & generating report...
          </span>
          <div className="w-48 h-[1px] bg-zinc-200 dark:bg-zinc-850 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1/3 h-full bg-zinc-800 dark:bg-zinc-250 animate-[shimmer_1.5s_infinite]" />
          </div>
        </div>
      )}

      {report && !loading && (
        <div className="border border-zinc-350 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
          <div className="border-b border-zinc-100 dark:border-zinc-850 pb-2.5 flex justify-between items-center font-mono text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-bold">
            <span>Report: {activeCardType?.replace(/-/g, ' ')}</span>
            <span>Generated Successfully</span>
          </div>

          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
              {report}
            </ReactMarkdown>
          </div>

          <div className="border-t border-zinc-150 dark:border-zinc-850 pt-3 flex justify-end">
            <button
              onClick={handleContinueInChat}
              className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-800 dark:hover:bg-white transition-colors"
            >
              Ask Follow-up in Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
