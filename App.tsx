import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Session } from '@google/genai';
import { AppStatus, TranscriptEntry } from './types';
import { connectToGeminiLive, cleanupAudio, playAudio, finishAudioTurn, stopAllAudio } from './services/geminiService';
import Transcript from './components/Transcript';
import Controls from './components/Controls';
import StatusIndicator from './components/StatusIndicator';
import RoleSetupModal from './components/RoleSetupModal';

const DEFAULT_SYSTEM_PROMPT = `你是一位名叫 Alex 的 AI 英文家教。你的目標是與使用者進行自然、友善的對話，幫助他們練習英語口說能力。當適當的時候，溫和地糾正他們的文法並建議更好的詞彙，但要以對話的方式進行。保持你的回應簡潔且鼓勵人心。`;

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [showRoleSetup, setShowRoleSetup] = useState<boolean>(false);

  const STORAGE_KEY = 'geminiTutorChatHistory' as const;
  const ROLE_STORAGE_KEY = 'geminiTutorSystemPrompt' as const;

  const sessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load system prompt and chat history on mount
  useEffect(() => {
    try {
      // Check for saved system prompt
      const savedPrompt = localStorage.getItem(ROLE_STORAGE_KEY);
      if (savedPrompt) {
        setSystemPrompt(savedPrompt);
      } else {
        // First time user - show setup modal
        setShowRoleSetup(true);
      }

      // Load chat history
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTranscript(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load saved data:', e);
      setShowRoleSetup(true);
    }
  }, []);

  // Auto-save chat history (limit to last 20 entries)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transcript.slice(-20)));
    } catch (e) {
      console.warn('Failed to save chat history:', e);
    }
  }, [transcript]);

  // Auto-save system prompt
  useEffect(() => {
    if (systemPrompt) {
      try {
        localStorage.setItem(ROLE_STORAGE_KEY, systemPrompt);
      } catch (e) {
        console.warn('Failed to save system prompt:', e);
      }
    }
  }, [systemPrompt]);

  const currentTranscriptionRef = useRef({ user: '', ai: '' });

  const handleRoleSetupComplete = (prompt: string) => {
    setSystemPrompt(prompt);
    setShowRoleSetup(false);
  };

  const cleanup = useCallback(() => {
    cleanupAudio();
    stopAllAudio();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleMessage = useCallback((message: LiveServerMessage) => {
    if (message.serverContent?.outputTranscription) {
      currentTranscriptionRef.current.ai += message.serverContent.outputTranscription.text;
    }
    if (message.serverContent?.inputTranscription) {
      currentTranscriptionRef.current.user += message.serverContent.inputTranscription.text;
    }

    if (message.serverContent?.turnComplete) {
      const userText = currentTranscriptionRef.current.user.trim();
      const aiText = currentTranscriptionRef.current.ai.trim();

      setTranscript(prev => {
        const newEntries: TranscriptEntry[] = [];
        if (userText) newEntries.push({ speaker: 'user', text: userText });
        if (aiText) newEntries.push({ speaker: 'ai', text: aiText });
        return [...prev, ...newEntries];
      });

      currentTranscriptionRef.current = { user: '', ai: '' };

      // Process and play the complete buffered audio with time-stretch
      finishAudioTurn();
    }

    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64Audio) {
      playAudio(base64Audio, speechRate);
    }

    if (message.serverContent?.interrupted) {
      stopAllAudio();
    }
  }, [speechRate]);

  const handleError = useCallback((e: ErrorEvent) => {
    console.error('Gemini Live API Error:', e);
    setErrorMessage('An error occurred with the connection. Please try again.');
    setStatus('error');
    cleanup();
  }, [cleanup]);

  const handleClose = useCallback((e: CloseEvent) => {
    console.log('Gemini Live API connection closed.');
    cleanup();
    if (status !== 'error') {
      setStatus('idle');
    }
  }, [status, cleanup]);

  const handleOpen = useCallback(() => {
    setStatus('live');
  }, []);

  const startConversation = async () => {
    setStatus('connecting');
    setErrorMessage(null);
    // Keep existing transcript for context, don't clear
    cleanup(); // Clean up any previous state

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Build conversation history context (last 10 turns)
      const historyContext = transcript.slice(-10).map(entry => `${entry.speaker.toUpperCase()}: ${entry.text}`).join('\\n');
      const enhancedPrompt = `${systemPrompt}\\n\\nContinue this conversation from the following history:\\n${historyContext}`;

      const session = await connectToGeminiLive({
        stream,
        systemPrompt: enhancedPrompt,
        onMessage: handleMessage,
        onError: handleError,
        onClose: handleClose,
        onOpen: handleOpen,
      });
      sessionRef.current = session;
    } catch (error) {
      console.error("Failed to start conversation:", error);
      let message = 'Failed to start. Please check your microphone permissions and API key.';
      if (error instanceof Error && error.name === 'NotAllowedError') {
        message = 'Microphone access was denied. Please allow microphone access in your browser settings.';
      } else if (error instanceof Error) {
        message = error.message;
      }
      setErrorMessage(message);
      setStatus('error');
      cleanup();
    }
  };

  const stopConversation = () => {
    if (sessionRef.current && status === 'live') {
      setStatus('stopping');
      sessionRef.current.close();
      sessionRef.current = null;
    }
  };

  const clearHistory = () => {
    setTranscript([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleToggleConversation = () => {
    if (status === 'live') {
      stopConversation();
    } else if (status === 'idle' || status === 'error') {
      startConversation();
    }
  };

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.close();
      }
      cleanup();
    }
  }, [cleanup]);

  return (
    <>
      {/* Role Setup Modal */}
      {showRoleSetup && <RoleSetupModal onComplete={handleRoleSetupComplete} />}

      <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="text-center mb-8 animate-fade-in-up">
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gradient mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          英文家教
        </h1>
        <p className="opacity-70" style={{ fontFamily: 'var(--font-body)' }}>
          與 Gemini AI 助理一起練習您的英文
        </p>
        <div className="decorative-line mt-4 max-w-md mx-auto"></div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col gap-6 max-w-5xl w-full mx-auto">
        {/* Status / Error Display */}
        <div className="flex items-center justify-center min-h-[3rem]">
          {errorMessage ? (
            <div
              className="px-6 py-3 rounded-lg border animate-fade-in-up"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: '#ef4444',
                color: '#fca5a5',
              }}
            >
              <p className="text-base font-medium">{errorMessage}</p>
            </div>
          ) : (
            <StatusIndicator status={status} />
          )}
        </div>

        {/* Transcript */}
        <Transcript entries={transcript} />

        {/* Controls */}
        <Controls
          status={status}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          speechRate={speechRate}
          setSpeechRate={setSpeechRate}
          onToggleConversation={handleToggleConversation}
          clearHistory={clearHistory}
        />
      </main>

      {/* Footer */}
      <footer className="text-center mt-8 opacity-40" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-xs">由 Google Gemini 提供支援 • 僅供教育用途</p>
      </footer>
    </div>
    </>
  );
};

export default App;
