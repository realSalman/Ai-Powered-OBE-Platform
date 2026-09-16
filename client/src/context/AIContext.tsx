"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { auth } from '@/lib/firebase';
import { apiClient, apiGet, apiPost, apiDelete, apiPut, getErrorMessage } from '@/lib/api';
import { IAIChat, IAIMessage, IAIKeyStatus } from '@/types/api';

interface AIContextType {
  chats: IAIChat[];
  activeChat: IAIChat | null;
  activeChatId: string | null;
  activeRole: string;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  hasApiKey: boolean;
  apiKeyValid: boolean;
  preferredModel: string;
  isDrawerOpen: boolean;
  currentToolExecution: string | null;

  sendMessage: (message: string, model?: string) => Promise<void>;
  setActiveChatId: (id: string | null) => void;
  setActiveRole: (role: string) => void;
  createNewChat: () => void;
  deleteChat: (chatId: string) => Promise<void>;
  refreshChats: () => Promise<void>;
  checkKeyStatus: () => Promise<void>;
  updatePreferredModel: (model: string) => Promise<void>;
  setIsDrawerOpen: (open: boolean) => void;
  clearError: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

export const AIProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, firebaseUser } = useAuth();
  
  const [chats, setChats] = useState<IAIChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState(false);
  const [preferredModel, setPreferredModel] = useState('openrouter/free');
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentToolExecution, setCurrentToolExecution] = useState<string | null>(null);

  // Derive active chat
  const activeChat = chats.find(c => c._id === activeChatId) || null;

  // Set default role when user changes
  useEffect(() => {
    if (user && user.roles && user.roles.length > 0) {
      setActiveRole(user.roles[0]);
    } else {
      setActiveRole('');
    }
  }, [user]);

  // Check key status from backend
  const checkKeyStatus = useCallback(async () => {
    if (!user) return;
    try {
      const response = await apiGet<IAIKeyStatus>('/ai/key/status');
      setHasApiKey(response.data.hasKey);
      setApiKeyValid(response.data.isValid);
      setPreferredModel(response.data.preferredModel);
    } catch (err: any) {
      console.error('Failed to retrieve key status:', err);
    }
  }, [user]);

  // Load status and chats when user changes
  useEffect(() => {
    if (user) {
      checkKeyStatus();
    } else {
      setChats([]);
      setActiveChatId(null);
    }
  }, [user, checkKeyStatus]);

  // Refresh user's chats
  const refreshChats = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await apiGet<IAIChat[]>('/ai/chats');
      setChats(response.data);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to fetch chats'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshChats();
    }
  }, [user, refreshChats]);

  // Create local placeholder for new chat
  const createNewChat = () => {
    setActiveChatId(null);
  };

  // Delete chat
  const deleteChat = async (chatId: string) => {
    try {
      await apiDelete(`/ai/chats/${chatId}`);
      setChats(prev => prev.filter(c => c._id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to delete chat'));
    }
  };

  // Update preferred model config
  const updatePreferredModel = async (model: string) => {
    try {
      await apiPut('/ai/key/model', { model });
      setPreferredModel(model);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to update preferred model'));
    }
  };

  // Send message with real-time SSE streaming
  const sendMessage = async (messageText: string, modelOverride?: string) => {
    if (!user) return;
    setError(null);
    setIsStreaming(true);
    setCurrentToolExecution(null);

    const targetModel = modelOverride || preferredModel;
    const isNewChat = !activeChatId;
    const tempId = activeChatId || `temp-${Date.now()}`;

    // 1. Create a local optimistic chat/message update
    const userMsg: IAIMessage = { role: 'user', content: messageText };
    const initialAssistantMsg: IAIMessage = { role: 'assistant', content: '' };

    if (isNewChat) {
      const optimisticChat: IAIChat = {
        _id: tempId,
        user: user._id,
        title: messageText.length > 30 ? messageText.slice(0, 30) + '...' : messageText,
        aiModel: targetModel,
        role: activeRole,
        messages: [userMsg, initialAssistantMsg],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setChats(prev => [optimisticChat, ...prev]);
      setActiveChatId(tempId);
    } else {
      setChats(prev => prev.map(c => {
        if (c._id === activeChatId) {
          return {
            ...c,
            messages: [...c.messages, userMsg, initialAssistantMsg],
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      }));
    }

    try {
      // 2. Fetch Firebase Auth Token
      const token = firebaseUser ? await firebaseUser.getIdToken() : '';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      // 3. Initiate native fetch for streaming
      const response = await fetch(`${apiUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: messageText,
          chatId: isNewChat ? undefined : activeChatId,
          model: targetModel,
          role: activeRole
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson?.message || 'Failed to establish connection with AI service');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let chatResult: IAIChat | null = null;
      let assistantText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Hold partial line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            let data: any;
            try {
              data = JSON.parse(trimmed.slice(6));
            } catch (err) {
              // Ignore JSON parser errors for cut-off stream blocks
              continue;
            }

            if (data.type === 'token') {
              assistantText += data.content;
              setChats(prev => prev.map(c => {
                if (c._id === tempId || c._id === activeChatId) {
                  const updatedMessages = [...c.messages];
                  // Update the last message (the assistant's one)
                  if (updatedMessages.length > 0) {
                    updatedMessages[updatedMessages.length - 1] = {
                      ...updatedMessages[updatedMessages.length - 1],
                      content: assistantText
                    };
                  }
                  return { ...c, messages: updatedMessages };
                }
                return c;
              }));
            } else if (data.type === 'tool_start') {
              setCurrentToolExecution(`Running ${data.toolName.replace(/_/g, ' ')}...`);
            } else if (data.type === 'tool_end') {
              setCurrentToolExecution(null);
            } else if (data.type === 'error') {
              throw new Error(data.content || 'An error occurred during generation');
            } else if (data.type === 'done') {
              // Completed! Includes the final chat object from server
              chatResult = data.content;
            }
          }
        }
      }

      // 4. Update the list with the final fully validated chat model from backend
      if (chatResult) {
        const finalChat = chatResult;
        setChats(prev => prev.map(c => (c._id === tempId || c._id === finalChat._id) ? finalChat : c));
        setActiveChatId(finalChat._id);
      } else {
        // Fallback: reload chats if something was missed
        await refreshChats();
      }

    } catch (err: any) {
      setError(err.message || 'Stream processing failed');
      // Remove optimistic new chat if it failed on first message
      if (isNewChat) {
        setChats(prev => prev.filter(c => c._id !== tempId));
        setActiveChatId(null);
      } else {
        // Revert last messages
        await refreshChats();
      }
    } finally {
      setIsStreaming(false);
      setCurrentToolExecution(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AIContext.Provider value={{
      chats,
      activeChat,
      activeChatId,
      activeRole,
      isLoading,
      isStreaming,
      error,
      hasApiKey,
      apiKeyValid,
      preferredModel,
      isDrawerOpen,
      currentToolExecution,
      sendMessage,
      setActiveChatId,
      setActiveRole,
      createNewChat,
      deleteChat,
      refreshChats,
      checkKeyStatus,
      updatePreferredModel,
      setIsDrawerOpen,
      clearError
    }}>
      {children}
    </AIContext.Provider>
  );
};
