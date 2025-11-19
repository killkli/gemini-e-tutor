import React, { useState } from 'react';
import { UserSettings } from '../types';

interface ApiKeyModalProps {
  onComplete: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onComplete }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('請輸入有效的 API 金鑰');
      return;
    }
    onComplete(apiKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-gray-700/50 shadow-2xl animate-slide-up">
        <h2 className="text-2xl font-bold mb-6 text-center text-white" style={{ fontFamily: 'var(--font-display)' }}>
          設定 Gemini API 金鑰
        </h2>
        <p className="text-gray-300 mb-6 text-center text-sm leading-relaxed">
          請輸入您的 Gemini API 金鑰（從 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Google AI Studio</a> 取得）
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="gemini-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-600/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-lg font-mono"
              style={{ fontFamily: 'var(--font-mono)' }}
              required
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm text-center p-3 bg-red-500/10 rounded-lg border border-red-500/30">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            確認並繼續
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-4 text-center">
          金鑰將安全儲存在您的瀏覽器本地儲存空間
        </p>
      </div>
    </div>
  );
};

export default ApiKeyModal;
