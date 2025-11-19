
import React from 'react';
import { AppStatus } from '../types';
import MicIcon from './icons/MicIcon';

interface ControlsProps {
  status: AppStatus;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  voiceModel: string;
  setVoiceModel: (model: string) => void;
  summaryModel: string;
  setSummaryModel: (model: string) => void;
  onToggleConversation: () => void;
  clearHistory?: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  status,
  systemPrompt,
  setSystemPrompt,
  speechRate,
  setSpeechRate,
  apiKey,
  setApiKey,
  voiceModel,
  setVoiceModel,
  summaryModel,
  setSummaryModel,
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
            {/* API Key */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                    Gemini API Key
                  </h3>
                  <p className="text-sm opacity-60">輸入您的 Gemini API 金鑰 (從 Google AI Studio 取得)</p>
                </div>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isRunning}
                placeholder="輸入 API 金鑰..."
                className="w-full px-4 py-3 rounded-lg border transition-all duration-200"
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
                  停止對話才能修改設定
                </p>
              )}
              {!apiKey && !isRunning && (
                <p className="text-xs mt-2 text-orange-400">請輸入 API 金鑰才能開始對話</p>
              )}
            </div>

            <div className="decorative-line"></div>

            {/* Voice Model */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.97 13.689a2 2 0 00-1.022-.547l-2.387-.477a6.6 6.6 0 00-.419-0.103a6.6 6.6 0 01-.419-.103l-.477-2.387a2 2 0 00-.547-1.022L3.124 8.167a6 6 0 00.517-3.86l-.158-.318a6 6 0 01.517-3.86l.477-2.387a2 2 0 00.547-1.022L6.311 1.03a6.6 6.6 0 00.103-.419 6.6 6.6 0 01.103-.419l2.387-.477a2 2 0 001.022-.547L13.833 3.124a6 6 0 003.86.517l.318.158a6 6 0 013.86.517l2.387.477a2 2 0 001.022.547l2.387.477a6.6 6.6 0 00.419.103 6.6 6.6 0 01.419.103l.477 2.387a2 2 0 00.547 1.022L20.876 10.833a6 6 0 00-.517 3.86l.158.318a6 6 0 01-.517 3.86l-.477 2.387a2 2 0 00-.547 1.022zM12 9a3 3 0 100 6 3 3 0 000-6z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                    語音對話模型
                  </h3>
                  <p className="text-sm opacity-60">Gemini Live API 模型名稱</p>
                </div>
              </div>
              <input
                type="text"
                value={voiceModel}
                onChange={(e) => setVoiceModel(e.target.value)}
                disabled={isRunning}
                placeholder="e.g. gemini-2.5-flash-native-audio-preview-09-2025"
                className="w-full px-4 py-3 rounded-lg border transition-all duration-200"
                style={{
                  fontFamily: 'var(--font-mono)', // Monospace for model names
                  background: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-body)',
                  opacity: isRunning ? 0.5 : 1,
                }}
              />
            </div>

            <div className="decorative-line"></div>

            {/* Summary Model */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                    學習總結模型
                  </h3>
                  <p className="text-sm opacity-60">用於產生學習狀況總結的模型</p>
                </div>
              </div>
              <input
                type="text"
                value={summaryModel}
                onChange={(e) => setSummaryModel(e.target.value)}
                disabled={isRunning}
                placeholder="e.g. models/gemini-flash-latest"
                className="w-full px-4 py-3 rounded-lg border transition-all duration-200"
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-body)',
                  opacity: isRunning ? 0.5 : 1,
                }}
              />
            </div>

            <div className="decorative-line"></div>

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
