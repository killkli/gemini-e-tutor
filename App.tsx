import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Session } from '@google/genai';
import { AppStatus, TranscriptEntry } from './types';
import { connectToGeminiLive, cleanupAudio, playAudio, finishAudioTurn, stopAllAudio } from './services/geminiService';
import Transcript from './components/Transcript';
import Controls from './components/Controls';
import StatusIndicator from './components/StatusIndicator';

const DEFAULT_SYSTEM_PROMPT = `You are an AI English tutor named Alex. Your goal is to have a natural, friendly conversation with the user to help them practice their English speaking skills. Correct their grammar and suggest better vocabulary when appropriate, but do it gently and conversationally. Keep your responses concise and encouraging.`;

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  const STORAGE_KEY = 'geminiTutorChatHistory' as const;

  const sessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load chat history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTranscript(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load chat history:', e);
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
  const currentTranscriptionRef = useRef({ user: '', ai: '' });

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
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col p-4 font-sans">
      <header className="text-center mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
          Gemini English Tutor
        </h1>
        <p className="text-gray-400 mt-1">Practice your English with a friendly AI companion</p>
      </header>

      <main className="flex-grow flex flex-col gap-4 max-w-4xl w-full mx-auto">
        <div className="h-10 flex items-center justify-center">
          {errorMessage ? (
            <p className="text-red-400 text-center">{errorMessage}</p>
          ) : <StatusIndicator status={status} />}
        </div>

        <Transcript entries={transcript} />

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

      <footer className="text-center text-gray-500 text-xs mt-4">
        <p>Powered by Google Gemini. For educational purposes only.</p>
      </footer>
    </div>
  );
};

export default App;
