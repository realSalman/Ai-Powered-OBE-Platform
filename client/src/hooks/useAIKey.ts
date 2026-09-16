import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiDelete, apiPut, getErrorMessage } from '@/lib/api';
import { IAIKeyStatus } from '@/types/api';
import { useAI } from '@/context/AIContext';

export const useAIKey = () => {
  const { checkKeyStatus, preferredModel } = useAI();
  const [isValidating, setIsValidating] = useState(false);
  const [keyStatus, setKeyStatus] = useState<IAIKeyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsValidating(true);
    setError(null);
    try {
      const response = await apiGet<IAIKeyStatus>('/ai/key/status');
      setKeyStatus(response.data);
      await checkKeyStatus(); // Sync main context
      return response.data;
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to check key status'));
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [checkKeyStatus]);

  const validateKeyOnly = async (apiKey: string): Promise<{ valid: boolean; label?: string; error?: string }> => {
    setIsValidating(true);
    setError(null);
    try {
      const response = await apiPost<{ valid: boolean; label?: string; error?: string }>('/ai/key/validate', { apiKey });
      return response.data;
    } catch (err: any) {
      const errMsg = getErrorMessage(err, 'Key validation request failed');
      setError(errMsg);
      return { valid: false, error: errMsg };
    } finally {
      setIsValidating(false);
    }
  };

  const saveKey = async (apiKey: string): Promise<boolean> => {
    setIsValidating(true);
    setError(null);
    try {
      await apiPost('/ai/key', { apiKey });
      await fetchStatus();
      return true;
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to save API key'));
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const deleteKey = async (): Promise<boolean> => {
    setIsValidating(true);
    setError(null);
    try {
      await apiDelete('/ai/key');
      setKeyStatus({
        hasKey: false,
        isValid: false,
        preferredModel: preferredModel || 'openai/gpt-4o-mini'
      });
      await checkKeyStatus(); // Sync main context
      return true;
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to delete API key'));
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  return {
    keyStatus,
    isValidating,
    error,
    checkStatus: fetchStatus,
    validateKey: validateKeyOnly,
    saveKey,
    deleteKey
  };
};
