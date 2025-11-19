
export type AppStatus = 'idle' | 'connecting' | 'live' | 'stopping' | 'error';

export interface TranscriptEntry {
  speaker: 'user' | 'ai';
  text: string;
  timestamp?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  createdAt: number;
}

export interface UserSettings {
  systemPrompt: string;
  speechRate: number;
  apiKey: string;
  voiceModel: string;
  summaryModel: string;
}

export interface LearningSummary {
  userId: string;
  summary: string;
  lastGenerated: number;
}
