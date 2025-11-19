import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Session } from '@google/genai';
import { AppStatus, TranscriptEntry, UserProfile } from './types';
import { connectToGeminiLive, cleanupAudio, playAudio, finishAudioTurn, stopAllAudio } from './services/geminiService';
import { storageService } from './services/storageService';
import { generateLearningSummary } from './services/summaryService';
import Transcript from './components/Transcript';
import Controls from './components/Controls';
import StatusIndicator from './components/StatusIndicator';
import RoleSetupModal from './components/RoleSetupModal';
import UserManagement from './components/UserManagement';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [showRoleSetup, setShowRoleSetup] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showUserManagement, setShowUserManagement] = useState<boolean>(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Use refs for current user and transcript to access them in callbacks/cleanup
  const currentUserRef = useRef<string | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const isGeneratingSummaryRef = useRef(false);

  // Initialize user on mount
  useEffect(() => {
    const savedUserId = storageService.getCurrentUserId();
    if (savedUserId) {
      // Verify user still exists
      const users = storageService.getUsers();
      if (users.some(u => u.id === savedUserId)) {
        handleUserSelect(savedUserId);
      } else {
        // User ID exists in storage but user data is gone
        setShowUserManagement(true);
      }
    } else {
      setShowUserManagement(true);
    }
  }, []);

  // Update refs when state changes
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const handleUserSelect = (userId: string) => {
    if (!userId) {
      setCurrentUser(null);
      setShowUserManagement(true);
      return;
    }

    setCurrentUser(userId);
    storageService.setCurrentUserId(userId);
    setShowUserManagement(false);
    loadUserData(userId);
  };

  const loadUserData = (userId: string) => {
    // Load settings
    const settings = storageService.getUserSettings(userId);
    setSystemPrompt(settings.systemPrompt);
    setSpeechRate(settings.speechRate);

    // Load transcript
    const savedTranscript = storageService.getUserTranscript(userId);
    setTranscript(savedTranscript);

    // If no system prompt is set (e.g. new user who hasn't completed setup), show setup
    // Note: storageService sets a default prompt, but we might want to let them customize it initially
    // For now, we trust the default from storageService, but if it was empty we'd show modal
    if (!settings.systemPrompt) {
      setShowRoleSetup(true);
    }
  };

  // Auto-save transcript changes
  useEffect(() => {
    if (currentUser && transcript.length > 0) {
      storageService.saveUserTranscript(currentUser, transcript);
    }
  }, [transcript, currentUser]);

  // Auto-save settings changes
  useEffect(() => {
    if (currentUser) {
      storageService.saveUserSettings(currentUser, {
        systemPrompt,
        speechRate
      });
    }
  }, [systemPrompt, speechRate, currentUser]);

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

  const handleGenerateSummary = useCallback(async () => {
    const userId = currentUserRef.current;
    const currentTranscript = transcriptRef.current;

    if (!userId || currentTranscript.length < 4 || isGeneratingSummaryRef.current) return;

    try {
      setIsGeneratingSummary(true);
      isGeneratingSummaryRef.current = true;

      const existingSummary = storageService.getLearningSummary(userId);
      const newSummary = await generateLearningSummary(
        currentTranscript,
        existingSummary?.summary
      );
      storageService.saveLearningSummary(userId, newSummary);
      console.log('Learning summary updated automatically');
    } catch (e) {
      console.error('Failed to update learning summary', e);
    } finally {
      setIsGeneratingSummary(false);
      isGeneratingSummaryRef.current = false;
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
        if (userText) newEntries.push({ speaker: 'user', text: userText, timestamp: Date.now() });
        if (aiText) newEntries.push({ speaker: 'ai', text: aiText, timestamp: Date.now() });
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

    // Generate summary on error/disconnect if enough content
    handleGenerateSummary();
  }, [cleanup, handleGenerateSummary]);

  const handleClose = useCallback((e: CloseEvent) => {
    console.log('Gemini Live API connection closed.');
    cleanup();
    if (status !== 'error') {
      setStatus('idle');
    }

    // Generate summary on close if enough content
    handleGenerateSummary();
  }, [status, cleanup, handleGenerateSummary]);

  const handleOpen = useCallback(() => {
    setStatus('live');
  }, []);

  const startConversation = async () => {
    if (!currentUser) {
      setShowUserManagement(true);
      return;
    }

    setStatus('connecting');
    setErrorMessage(null);
    cleanup();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Build conversation history context (last 10 turns)
      const historyContext = transcript.slice(-10).map(entry => `${entry.speaker.toUpperCase()}: ${entry.text}`).join('\n');

      // Get learning summary if available
      const learningSummary = storageService.getLearningSummary(currentUser);
      const learningContext = learningSummary ? `\n\nUser Learning Status Summary:\n${learningSummary.summary}` : '';

      const enhancedPrompt = `${systemPrompt}${learningContext}\n\nContinue this conversation from the following history:\n${historyContext}`;

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
      // handleClose will be called automatically, which triggers summary generation
    }
  };

  const clearHistory = () => {
    setTranscript([]);
    if (currentUser) {
      storageService.saveUserTranscript(currentUser, []);
    }
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

  // If we're in user management mode and not already showing it via a button click
  if (!currentUser && !showUserManagement) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
         <UserManagement onUserSelect={handleUserSelect} currentUser={currentUser} />
      </div>
    );
  }

  return (
    <>
      {/* Role Setup Modal */}
      {showRoleSetup && <RoleSetupModal onComplete={handleRoleSetupComplete} />}

      {/* User Management Modal */}
      {showUserManagement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <UserManagement onUserSelect={handleUserSelect} currentUser={currentUser} />
            {currentUser && (
              <button
                onClick={() => setShowUserManagement(false)}
                className="mt-4 w-full py-2 text-gray-400 hover:text-white transition-colors"
              >
                返回
              </button>
            )}
          </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="text-center mb-8 animate-fade-in-up relative">
        {currentUser && (
          <div className="absolute right-0 top-0 flex items-center gap-2">
            {isGeneratingSummary && (
               <span className="text-xs text-amber-400 animate-pulse">正在更新學習狀況...</span>
            )}
            <button
              onClick={() => setShowUserManagement(true)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm flex items-center gap-2 transition-colors"
            >
              <span>👤</span>
              <span>切換使用者</span>
            </button>
          </div>
        )}

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
