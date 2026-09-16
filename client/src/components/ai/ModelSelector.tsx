"use client";

import React from 'react';
import { useAI } from '@/context/AIContext';

const AVAILABLE_MODELS = [
  { id: 'openrouter/free', name: 'Auto-Select' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'x-ai/grok-4-fast:free', name: 'Grok-4 Fast' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B' },

];

export default function ModelSelector() {
  const { preferredModel, updatePreferredModel, isStreaming } = useAI();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value;
    await updatePreferredModel(modelId);
  };

  return (
    <div className="flex items-center gap-2 font-mono text-[10px]">
      <label className="text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">
        MODEL:
      </label>
      <select
        value={preferredModel}
        onChange={handleChange}
        disabled={isStreaming}
        className="px-2 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-none uppercase font-bold text-[9px] tracking-wider cursor-pointer"
      >
        {AVAILABLE_MODELS.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
}
