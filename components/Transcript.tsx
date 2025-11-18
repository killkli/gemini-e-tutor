
import React, { useRef, useEffect } from 'react';
import { TranscriptEntry } from '../types';

interface TranscriptProps {
  entries: TranscriptEntry[];
}

const Transcript: React.FC<TranscriptProps> = ({ entries }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="flex-grow card-elevated p-4 sm:p-6 overflow-y-auto">
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-center" style={{ fontFamily: 'var(--font-body)' }}>
            開始對話以進行英文練習
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {entries.map((entry, index) => (
            <div
              key={index}
              className={`flex animate-slide-in ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-md lg:max-w-xl">
                <span
                  className="text-sm font-medium px-2 opacity-60"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {entry.speaker === 'user' ? '你' : 'AI 家教'}
                </span>
                <div
                  className="px-4 py-3 rounded-2xl transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '1.1rem',
                    lineHeight: '1.7',
                    background: entry.speaker === 'user'
                      ? 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)'
                      : 'var(--color-bg-secondary)',
                    borderRadius: entry.speaker === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    border: entry.speaker === 'ai' ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  <p>{entry.text}</p>
                </div>
              </div>
            </div>
          ))}
          <div ref={endOfMessagesRef} />
        </div>
      )}
    </div>
  );
};

export default Transcript;
