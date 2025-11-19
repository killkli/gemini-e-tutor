import { UserProfile, UserSettings, TranscriptEntry, LearningSummary } from '../types';

const STORAGE_KEYS = {
  USERS: 'geminiTutor_users',
  CURRENT_USER_ID: 'geminiTutor_currentUserId',
  SETTINGS_PREFIX: 'geminiTutor_settings_',
  TRANSCRIPT_PREFIX: 'geminiTutor_transcript_',
  SUMMARY_PREFIX: 'geminiTutor_summary_',
};

const DEFAULT_SETTINGS: UserSettings = {
  systemPrompt: `你是一位名叫 Alex 的 AI 英文家教。你的目標是與使用者進行自然、友善的對話，幫助他們練習英語口說能力。當適當的時候，溫和地糾正他們的文法並建議更好的詞彙，但要以對話的方式進行。保持你的回應簡潔且鼓勵人心。`,
  speechRate: 1.0,
  apiKey: '',
  voiceModel: 'gemini-2.5-flash-native-audio-preview-09-2025',
  summaryModel: 'models/gemini-flash-latest',
};

export const storageService = {
  // User Management
  getUsers: (): UserProfile[] => {
    try {
      const users = localStorage.getItem(STORAGE_KEYS.USERS);
      return users ? JSON.parse(users) : [];
    } catch (e) {
      console.error('Failed to load users:', e);
      return [];
    }
  },

  saveUsers: (users: UserProfile[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  createUser: (name: string): UserProfile => {
    const users = storageService.getUsers();
    const newUser: UserProfile = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
    };
    users.push(newUser);
    storageService.saveUsers(users);

    // Initialize default settings for new user
    storageService.saveUserSettings(newUser.id, DEFAULT_SETTINGS);

    return newUser;
  },

  deleteUser: (userId: string) => {
    const users = storageService.getUsers().filter(u => u.id !== userId);
    storageService.saveUsers(users);

    // Cleanup related data
    localStorage.removeItem(STORAGE_KEYS.SETTINGS_PREFIX + userId);
    localStorage.removeItem(STORAGE_KEYS.TRANSCRIPT_PREFIX + userId);
    localStorage.removeItem(STORAGE_KEYS.SUMMARY_PREFIX + userId);

    // If deleted user was current, clear current user
    if (storageService.getCurrentUserId() === userId) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
  },

  // Current User
  getCurrentUserId: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  },

  setCurrentUserId: (userId: string) => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  },

  // Settings
  getUserSettings: (userId: string): UserSettings => {
    try {
      const settingsStr = localStorage.getItem(STORAGE_KEYS.SETTINGS_PREFIX + userId);
      const parsed = settingsStr ? JSON.parse(settingsStr) : {};
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
      console.error(`Failed to load settings for user ${userId}:`, e);
      return DEFAULT_SETTINGS;
    }
  },

  saveUserSettings: (userId: string, settings: UserSettings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS_PREFIX + userId, JSON.stringify(settings));
  },

  // Transcript
  getUserTranscript: (userId: string): TranscriptEntry[] => {
    try {
      const transcript = localStorage.getItem(STORAGE_KEYS.TRANSCRIPT_PREFIX + userId);
      return transcript ? JSON.parse(transcript) : [];
    } catch (e) {
      console.error(`Failed to load transcript for user ${userId}:`, e);
      return [];
    }
  },

  saveUserTranscript: (userId: string, transcript: TranscriptEntry[]) => {
    // Limit to last 100 entries to prevent overflow, but keep enough for history
    // We might want to archive older ones later if needed, but for now simple truncation
    const recentTranscript = transcript.slice(-100);
    localStorage.setItem(STORAGE_KEYS.TRANSCRIPT_PREFIX + userId, JSON.stringify(recentTranscript));
  },

  // Learning Summary
  getLearningSummary: (userId: string): LearningSummary | null => {
     try {
      const summary = localStorage.getItem(STORAGE_KEYS.SUMMARY_PREFIX + userId);
      return summary ? JSON.parse(summary) : null;
    } catch (e) {
      console.error(`Failed to load summary for user ${userId}:`, e);
      return null;
    }
  },

  saveLearningSummary: (userId: string, summary: string) => {
    const learningSummary: LearningSummary = {
        userId,
        summary,
        lastGenerated: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.SUMMARY_PREFIX + userId, JSON.stringify(learningSummary));
  }
};
