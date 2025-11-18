
import React from 'react';
import { AppStatus } from '../types';
import MicIcon from './icons/MicIcon';
import SettingsIcon from './icons/SettingsIcon';

interface ControlsProps {
  status: AppStatus;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  onToggleConversation: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  status,
  systemPrompt,
  setSystemPrompt,
  speechRate,
  setSpeechRate,
  onToggleConversation,
}) => {
  const isRunning = status === 'live' || status === 'connecting';
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg flex flex-col items-center gap-4">
      <div className="w-full">
        <div className="flex justify-end">
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className="p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Toggle Settings"
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
        </div>

        {showSettings && (
          <div className="w-full flex flex-col gap-4 mb-4 animate-fade-in">
            <div>
              <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-300 mb-1">
                System Prompt
              </label>
              <textarea
                id="system-prompt"
                rows={4}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                disabled={isRunning}
              />
            </div>
            <div>
              <label htmlFor="speech-rate" className="block text-sm font-medium text-gray-300 mb-1">
                AI Speech Speed: {speechRate.toFixed(1)}x
              </label>
              <input
                id="speech-rate"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onToggleConversation}
        disabled={status === 'connecting' || status === 'stopping'}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-900
          ${isRunning ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}
          ${(status === 'connecting' || status === 'stopping') ? 'cursor-not-allowed opacity-70' : ''}
        `}
        aria-label={isRunning ? 'Stop conversation' : 'Start conversation'}
      >
        <MicIcon className="w-8 h-8 text-white" />
        {status === 'live' && (
          <span className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-75"></span>
        )}
      </button>
    </div>
  );
};

export default Controls;
