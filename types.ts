
export type AppStatus = 'idle' | 'connecting' | 'live' | 'stopping' | 'error';

export interface TranscriptEntry {
  speaker: 'user' | 'ai';
  text: string;
}
