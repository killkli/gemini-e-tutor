
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
    <div className="flex-grow bg-gray-800/50 rounded-lg p-4 md:p-6 overflow-y-auto space-y-4">
      {entries.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Start the conversation to see the transcript here.</p>
        </div>
      ) : (
        entries.map((entry, index) => (
          <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs md:max-w-md lg:max-w-2xl px-4 py-2 rounded-xl ${
                entry.speaker === 'user'
                  ? 'bg-blue-600 rounded-br-none'
                  : 'bg-gray-700 rounded-bl-none'
              }`}
            >
              <p className="text-sm md:text-base">{entry.text}</p>
            </div>
          </div>
        ))
      )}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default Transcript;
