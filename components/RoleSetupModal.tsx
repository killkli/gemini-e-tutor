import React, { useState } from 'react';

interface RoleSetupModalProps {
  onComplete: (systemPrompt: string) => void;
}

const PRESET_ROLES = [
  {
    name: '友善的英文家教',
    icon: '👨‍🏫',
    prompt: '你是一位名叫 Alex 的 AI 英文家教。你的目標是與使用者進行自然、友善的對話，幫助他們練習英語口說能力。當適當的時候，溫和地糾正他們的文法並建議更好的詞彙，但要以對話的方式進行。保持你的回應簡潔且鼓勵人心。',
  },
  {
    name: '嚴格的發音教練',
    icon: '🎯',
    prompt: '你是一位專業的英文發音教練。你會仔細聆聽使用者的發音，並提供詳細的改進建議。特別關注重音、語調和常見的發音錯誤。用清晰的例子說明正確的發音方式，並鼓勵使用者重複練習。',
  },
  {
    name: '日常對話夥伴',
    icon: '💬',
    prompt: '你是一位喜歡聊天的英文母語者。用輕鬆、自然的方式與使用者對話，就像朋友之間的閒聊。談論日常生活、興趣愛好等話題。偶爾提供一些實用的口語表達和俚語，讓對話更生動。',
  },
  {
    name: '商務英文顧問',
    icon: '💼',
    prompt: '你是一位專精商務英文的顧問。幫助使用者練習職場情境的英文對話，包括會議、簡報、電子郵件溝通等。提供專業的商務用語建議，並糾正可能在商業場合造成誤會的表達方式。',
  },
  {
    name: '自訂角色',
    icon: '✏️',
    prompt: '',
  },
];

const RoleSetupModal: React.FC<RoleSetupModalProps> = ({ onComplete }) => {
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const handleComplete = () => {
    if (selectedRole === null) return;

    const isCustom = selectedRole === PRESET_ROLES.length - 1;
    const prompt = isCustom ? customPrompt : PRESET_ROLES[selectedRole].prompt;

    if (!prompt.trim()) return;

    onComplete(prompt);
  };

  const isCustom = selectedRole === PRESET_ROLES.length - 1;
  const canComplete = selectedRole !== null && (!isCustom || customPrompt.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-8 animate-fade-in-up"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-gradient" style={{ fontFamily: 'var(--font-display)' }}>
            歡迎使用英文家教
          </h2>
          <p className="text-lg opacity-80">
            請選擇您的 AI 家教角色，開始練習英文
          </p>
        </div>

        <div className="decorative-line mb-6"></div>

        {/* Role Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {PRESET_ROLES.map((role, index) => (
            <button
              key={index}
              onClick={() => setSelectedRole(index)}
              className="text-left p-5 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: selectedRole === index ? 'var(--color-accent-primary)' : 'var(--color-bg-secondary)',
                border: selectedRole === index ? '2px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
                color: selectedRole === index ? 'var(--color-bg-primary)' : 'var(--color-text-body)',
              }}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{role.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{role.name}</h3>
                  {role.prompt && (
                    <p className="text-sm opacity-75 line-clamp-2">
                      {role.prompt.substring(0, 80)}...
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Custom Prompt Input */}
        {isCustom && (
          <div className="mb-6 animate-fade-in-up">
            <label className="block text-base font-medium mb-2">
              描述您的自訂角色
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={5}
              placeholder="例如：你是一位專門教授旅遊英文的老師..."
              className="w-full px-4 py-3 rounded-lg border transition-all duration-200 resize-none text-base"
              style={{
                background: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-body)',
              }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleComplete}
            disabled={!canComplete}
            className="px-8 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            style={{
              background: canComplete ? 'linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))' : 'var(--color-bg-secondary)',
              color: canComplete ? 'var(--color-bg-primary)' : 'var(--color-text-body)',
              boxShadow: canComplete ? '0 4px 20px rgba(245, 158, 11, 0.4)' : 'none',
            }}
          >
            開始使用
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSetupModal;
