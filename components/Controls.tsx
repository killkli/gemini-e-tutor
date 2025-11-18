
import React from 'react';
import { AppStatus } from '../types';
import MicIcon from './icons/MicIcon';

interface ControlsProps {
  status: AppStatus;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  onToggleConversation: () => void;
  clearHistory?: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  status,
  systemPrompt,
  setSystemPrompt,
  speechRate,
  setSpeechRate,
  onToggleConversation,
  clearHistory,
}) => {
  const isRunning = status === 'live' || status === 'connecting';
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <div className="card-elevated p-6">
      <div className="flex flex-col gap-6">
        {/* Settings Toggle and Clear Button */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{
              background: showSettings ? 'var(--color-accent-primary)' : 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: showSettings ? 'var(--color-bg-primary)' : 'var(--color-text-body)',
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="text-base font-medium">{showSettings ? '收起設定' : '展開設定'}</span>
          </button>

          <button
            onClick={clearHistory}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-body)',
            }}
            title="清除對話紀錄"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-base font-medium">清除紀錄</span>
          </button>
        </div>

        {/* Expandable Settings */}
        {showSettings && (
          <div className="space-y-6 animate-fade-in-up">
            {/* AI Tutor Role */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                    AI 家教角色設定
                  </h3>
                  <p className="text-sm opacity-60">定義您的 AI 家教的個性和教學風格</p>
                </div>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                disabled={isRunning}
                rows={4}
                placeholder="描述您希望 AI 家教如何互動..."
                className="w-full px-4 py-3 rounded-lg border transition-all duration-200 resize-none"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  background: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-body)',
                  opacity: isRunning ? 0.5 : 1,
                }}
              />
              {isRunning && (
                <p className="text-xs mt-2 opacity-50 italic">
                  停止對話才能修改角色設定
                </p>
              )}
            </div>

            <div className="decorative-line"></div>

            {/* Speech Rate */}
            <div>
              <label className="block text-base font-medium mb-2 opacity-80">
                AI 語音速度：<span className="text-gradient font-semibold">{speechRate.toFixed(1)}x</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--color-accent-primary) 0%, var(--color-accent-primary) ${((speechRate - 0.5) / 1.5) * 100}%, var(--color-bg-secondary) ${((speechRate - 0.5) / 1.5) * 100}%, var(--color-bg-secondary) 100%)`,
                }}
              />
            </div>
          </div>
        )}

        {/* Main Mic Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={onToggleConversation}
            disabled={status === 'connecting' || status === 'stopping'}
            className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isRunning
                ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                : 'linear-gradient(135deg, var(--color-accent-primary) 0%, var(--color-accent-secondary) 100%)',
              boxShadow: isRunning
                ? '0 8px 32px rgba(220, 38, 38, 0.4)'
                : '0 8px 32px rgba(245, 158, 11, 0.4)',
            }}
            aria-label={isRunning ? '停止對話' : '開始對話'}
          >
            <MicIcon className="w-10 h-10 text-white relative z-10" />
            {status === 'live' && (
              <span
                className="absolute inset-0 rounded-full animate-pulse-glow"
                style={{ background: 'radial-gradient(circle, rgba(220, 38, 38, 0.6), transparent)' }}
              ></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Controls;
