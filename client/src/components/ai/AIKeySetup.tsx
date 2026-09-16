"use client";

import React, { useState, useEffect } from 'react';
import { useAIKey } from '@/hooks/useAIKey';
import { useAI } from '@/context/AIContext';

interface AIKeySetupProps {
  onSuccess?: () => void;
}

export default function AIKeySetup({ onSuccess }: AIKeySetupProps) {
  const { keyStatus, isValidating, error, checkStatus, validateKey, saveKey, deleteKey } = useAIKey();
  const { preferredModel } = useAI();
  const [inputKey, setInputKey] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; label?: string; error?: string } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleValidate = async () => {
    setLocalError(null);
    setValidationResult(null);
    const trimmed = inputKey.trim();
    if (!trimmed) {
      setLocalError('Please enter an API key to validate.');
      return;
    }
    const result = await validateKey(trimmed);
    setValidationResult(result);
    if (!result.valid) {
      setLocalError(result.error || 'API key validation failed. Please check your key.');
    }
  };

  const handleSave = async () => {
    setLocalError(null);
    const trimmed = inputKey.trim();
    if (!trimmed) {
      setLocalError('Please enter an API key to save.');
      return;
    }
    const success = await saveKey(trimmed);
    if (success) {
      setInputKey('');
      setValidationResult(null);
      if (onSuccess) onSuccess();
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to remove your API key? You will not be able to use AI features until you configure a key.')) {
      const success = await deleteKey();
      if (success) {
        setInputKey('');
        setValidationResult(null);
      }
    }
  };

  const isLoading = isValidating;

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 font-mono text-xs w-full max-w-xl mx-auto space-y-6">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 flex justify-between items-center">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
          OpenRouter API Configuration
        </h2>
        <span className={`px-2 py-0.5 border text-[9px] uppercase tracking-widest ${keyStatus?.hasKey
            ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
            : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
          }`}>
          {keyStatus?.hasKey ? 'Configured' : 'No Key'}
        </span>
      </div>

      {!keyStatus?.hasKey ? (
        <div className="space-y-4">
          <div className="space-y-2 text-zinc-500 dark:text-zinc-400 leading-relaxed text-[11px]">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">To get started with Atlas AI, connect your own API key:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Visit <a href="https://openrouter.ai/" target="_blank" rel="noreferrer" className="text-zinc-900 dark:text-zinc-200 underline font-bold">openrouter.ai</a> and create an account.</li>
              <li>Navigate to <span className="font-bold">Keys</span> and generate a new API key.</li>
              <li>Make sure you have active credits or a payment method configured.</li>
              <li>Paste the generated key below to encrypt and store it securely in our system.</li>
            </ol>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase">API Key</label>
              <div className="relative flex items-stretch">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="px-3 border-y border-r border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-[10px] uppercase font-bold"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleValidate}
                disabled={isLoading || !inputKey.trim()}
                className="px-4 py-2 border border-zinc-350 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-900 text-zinc-650 hover:bg-zinc-200 dark:hover:bg-zinc-850 disabled:opacity-50 transition-colors uppercase font-bold text-[10px] tracking-wider"
              >
                {isLoading ? 'Validating...' : 'Test Key'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading || !inputKey.trim() || (validationResult !== null && !validationResult.valid)}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-50 transition-colors uppercase font-bold text-[10px] tracking-wider"
              >
                {isLoading ? 'Saving...' : 'Save & Enable AI'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 rounded-none space-y-3">
            <div className="grid grid-cols-3 gap-y-1.5 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300">
              <span className="text-zinc-400 font-bold uppercase text-[10px]">Status:</span>
              <span className="col-span-2 text-green-600 dark:text-green-400 font-bold">✓ Active & Configured</span>

              <span className="text-zinc-400 font-bold uppercase text-[10px]">Validation:</span>
              <span className={`col-span-2 ${keyStatus?.isValid ? 'text-zinc-800 dark:text-zinc-150' : 'text-amber-500'}`}>
                {keyStatus?.isValid ? 'Verified' : 'Unverified / Expired'}
              </span>

              {keyStatus?.lastValidated && (
                <>
                  <span className="text-zinc-400 font-bold uppercase text-[10px]">Last Tested:</span>
                  <span className="col-span-2">
                    {new Date(keyStatus.lastValidated).toLocaleString()}
                  </span>
                </>
              )}

              <span className="text-zinc-400 font-bold uppercase text-[10px]">Active Model:</span>
              <span className="col-span-2 font-mono text-[10px] text-zinc-900 dark:text-zinc-100">
                {keyStatus?.preferredModel || preferredModel}
              </span>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 flex justify-between items-center">
              <p className="text-[10px] text-zinc-400 leading-normal">
                Your key is stored securely using industry-standard AES-256-GCM encryption.
              </p>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="px-3 py-1.5 border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/20 disabled:opacity-50 transition-colors uppercase font-bold text-[9px] tracking-wider"
              >
                Delete Key
              </button>
            </div>
          </div>
        </div>
      )}

      {validationResult && (
        <div className={`p-3 border text-[11px] font-bold uppercase tracking-wider ${validationResult.valid
            ? 'border-green-200 dark:border-green-900/60 bg-green-50 dark:bg-green-950/10 text-green-700 dark:text-green-400'
            : 'border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/10 text-red-700 dark:text-red-400'
          }`}>
          {validationResult.valid
            ? `✓ Key is Valid (Label: ${validationResult.label || 'Active'})`
            : `✗ Verification failed: ${validationResult.error || 'Check credentials/credits.'}`}
        </div>
      )}

      {(error || localError) && (
        <div className="p-3 border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/10 text-red-700 dark:text-red-400 text-[11px] font-bold uppercase">
          * Error: {error || localError}
        </div>
      )}
    </div>
  );
}
