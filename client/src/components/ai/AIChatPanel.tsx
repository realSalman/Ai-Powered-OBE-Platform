"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAI } from '@/context/AIContext';
import AIChatMessage from './AIChatMessage';
import ModelSelector from './ModelSelector';
import AIKeySetup from './AIKeySetup';

interface AIChatPanelProps {
  onClose: () => void;
}

export default function AIChatPanel({ onClose }: AIChatPanelProps) {
  const {
    chats,
    activeChat,
    activeChatId,
    isStreaming,
    isLoading,
    error,
    hasApiKey,
    currentToolExecution,
    sendMessage,
    setActiveChatId,
    createNewChat,
    deleteChat,
    clearError
  } = useAI();

  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [panelWidth, setPanelWidth] = useState(450); // Default width in pixels
  const [isMobile, setIsMobile] = useState(false);
  const isResizing = useRef(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, isStreaming, currentToolExecution]);

  // Focus input on mount/chat switch
  useEffect(() => {
    if (hasApiKey && !showSettings && !isLoading) {
      inputRef.current?.focus();
    }
  }, [activeChatId, hasApiKey, showSettings, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    const messageText = input;
    setInput('');
    await sendMessage(messageText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Dragging logic for resizer
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    // Bounds check: keep drawer width between 320px and 700px
    if (newWidth >= 320 && newWidth <= 800) {
      setPanelWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      style={{ width: isMobile ? '100%' : `${panelWidth}px` }}
      className="fixed md:relative inset-y-0 right-0 z-50 md:z-10 flex bg-zinc-900 border-l border-zinc-800 text-xs font-mono shadow-[0_0_20px_rgba(0,0,0,0.5)] md:shadow-none overflow-hidden shrink-0 h-full"
    >
      {/* Width Drag Handle */}
      <div
        onMouseDown={startResizing}
        className="w-1 cursor-col-resize h-full bg-zinc-800 hover:bg-zinc-650 transition-colors flex items-center justify-center select-none"
      />

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex justify-between items-center bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <ModelSelector />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`px-2 py-1 border hover:bg-zinc-800 transition-colors tracking-widest ${showSettings
                ? 'border-zinc-100 text-zinc-100 bg-zinc-800'
                : 'border-zinc-800 text-zinc-400'
                }`}
            >
              ⚙ KEY
            </button>
            <button
              onClick={onClose}
              className="text-zinc-550 hover:text-zinc-200 transition-colors text-base font-bold px-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Configuration Setup Overlay/State */}
        {showSettings ? (
          <div className="flex-1 overflow-y-auto p-4 bg-zinc-900/90 scrollbar-hide">
            <div className="mb-4 flex justify-between items-center">
              <span className="font-bold text-zinc-300 text-[10px]">API SETTINGS</span>
              <button
                onClick={() => setShowSettings(false)}
                className="text-zinc-500 hover:text-zinc-300 uppercase font-bold text-[9px]"
              >
                Back to Chat
              </button>
            </div>
            <AIKeySetup onSuccess={() => setShowSettings(false)} />
          </div>
        ) : !hasApiKey ? (
          <div className="flex-1 flex flex-col justify-center p-6 space-y-4 bg-zinc-950/30 overflow-y-auto">
            <div className="text-center space-y-2">
              <h3 className="font-bold text-zinc-200 uppercase tracking-widest">Connect API Key</h3>
              <p className="text-zinc-500 text-[10px] leading-relaxed max-w-xs mx-auto">
                An OpenRouter API key is required to activate the AI layer. Configure your key to begin.
              </p>
            </div>
            <AIKeySetup onSuccess={() => setShowSettings(false)} />
          </div>
        ) : (
          /* Normal Chat Interface */
          <>
            {/* Model & History Tabs Header */}

            {/* Chat History Drawer Dropdown / Tab list if many chats exist */}
            {chats.length > 0 && (
              <div className="px-4 py-1.5 flex gap-2 overflow-x-auto scrollbar-hide bg-zinc-950/10">
                {chats.map(chat => {
                  const isActive = chat._id === activeChatId;
                  return (
                    <div
                      key={chat._id}
                      className={`flex items-center shrink-0 border uppercase tracking-tight text-[9px] font-bold ${isActive
                        ? 'border-zinc-400 text-zinc-200 bg-zinc-800'
                        : 'border-zinc-850 text-zinc-500 bg-zinc-950/20 hover:border-zinc-700'
                        }`}
                    >
                      <button
                        onClick={() => setActiveChatId(chat._id)}
                        disabled={isLoading || isStreaming}
                        className="px-2 py-0.5 max-w-[100px] truncate"
                      >
                        {chat.title}
                      </button>
                      <button
                        onClick={() => deleteChat(chat._id)}
                        disabled={isLoading || isStreaming}
                        className="px-1 hover:text-red-400 border-l border-zinc-850/50"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={createNewChat}
                  disabled={isLoading || isStreaming}
                  className="px-2 py-1 border border-zinc-800 text-zinc-350 hover:bg-zinc-850 transition-colors font-bold uppercase text-[9px]"
                >
                  + NEW
                </button>
              </div>
            )}


            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-zinc-950/20">
              {activeChat && activeChat.messages && activeChat.messages.length > 0 ? (
                activeChat.messages.map((msg, i) => (
                  <AIChatMessage key={i} message={msg} />
                ))
              ) : (
                <div className="h-full flex flex-col justify-center items-center text-center space-y-4 text-zinc-550 p-6 leading-relaxed">
                  <div className="w-12 h-12 border border-zinc-800 text-zinc-700 flex items-center justify-center text-lg animate-pulse">

                  </div>
                  <div className="space-y-1">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-zinc-400">Atlas AI</p>
                    <p className="text-[10px] max-w-xs mx-auto text-zinc-500">
                      Ask any questions about grades, outcomes attainment, course offerings, study paths, or at-risk student records.
                    </p>
                  </div>
                </div>
              )}

              {/* Tool Execution Block */}
              {currentToolExecution && (
                <div className="flex items-center gap-2.5 text-zinc-400 font-mono text-[10px] italic bg-zinc-950/40 p-2.5 border border-zinc-850 border-l-2 border-l-zinc-500 animate-pulse">
                  <span>⚒ {currentToolExecution}</span>
                </div>
              )}

              {/* General error message inside chat */}
              {error && (
                <div className="p-3 border border-red-900/60 bg-red-950/15 text-red-400 text-[10px] uppercase font-bold flex justify-between items-center">
                  <span>* Error: {error}</span>
                  <button onClick={clearError} className="hover:text-red-200">✕</button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3  bg-zinc-950/40 flex items-stretch gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isStreaming
                    ? 'Streaming...'
                    : 'Type message here....'
                }
                rows={2}
                disabled={isStreaming || isLoading}
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-850 text-zinc-200 focus:outline-none focus:border-zinc-750 text-xs font-mono resize-none rounded-none"
              />

              <button
                type="submit"
                disabled={isStreaming || isLoading || !input.trim()}
                className="px-4 bg-zinc-100 text-zinc-900 font-bold hover:bg-white disabled:opacity-40 transition-colors uppercase tracking-widest text-[9px] border border-zinc-200 flex items-center justify-center shrink-0"
              >
                {isStreaming ? 'STREAMING' : 'SEND'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
