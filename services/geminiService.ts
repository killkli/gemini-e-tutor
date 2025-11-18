import { GoogleGenAI, LiveServerMessage, Modality, Session, Blob } from '@google/genai';

// --- Audio Encoding/Decoding Utilities ---

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createPcmBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

/**
 * Converts PCM audio data to WAV format
 */
function pcmToWav(pcmData: Uint8Array, sampleRate: number, numChannels: number): ArrayBuffer {
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Copy PCM data
  const pcmView = new Uint8Array(buffer, 44);
  pcmView.set(pcmData);

  return buffer;
}

/**
 * Converts base64 PCM audio to WAV Blob URL for use with HTMLAudioElement
 */
function createWavBlobUrl(base64Data: string, sampleRate: number, numChannels: number): string {
  const pcmData = decode(base64Data);
  const wavData = pcmToWav(pcmData, sampleRate, numChannels);
  const blob = new window.Blob([wavData], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}


// --- Gemini Live Service ---

let inputAudioContext: AudioContext;
let outputAudioContext: AudioContext;
let scriptProcessor: ScriptProcessorNode;
let mediaStreamSource: MediaStreamAudioSourceNode;
let nextStartTime = 0;
const sources = new Set<AudioBufferSourceNode>();

// Audio chunk buffering for complete turn processing
let audioChunkBuffer: string[] = []; // Store base64 audio data
let currentSpeechRate: number = 1.0;
let currentAudioElement: HTMLAudioElement | null = null;
let audioQueue: Array<{ url: string; rate: number }> = [];
let isPlaying: boolean = false;

interface ConnectToGeminiLiveParams {
    stream: MediaStream;
    systemPrompt: string;
    onMessage: (message: LiveServerMessage) => void;
    onError: (e: ErrorEvent) => void;
    onClose: (e: CloseEvent) => void;
    onOpen: () => void;
}

export async function connectToGeminiLive({
    stream,
    systemPrompt,
    onMessage,
    onError,
    onClose,
    onOpen
}: ConnectToGeminiLiveParams): Promise<Session> {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => {
                inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                
                mediaStreamSource = inputAudioContext.createMediaStreamSource(stream);
                scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                
                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                    const pcmBlob = createPcmBlob(inputData);
                    sessionPromise.then((session) => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                };
                
                mediaStreamSource.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContext.destination);
                onOpen();
            },
            onmessage: onMessage,
            onerror: onError,
            onclose: onClose,
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: systemPrompt,
        },
    });

    return sessionPromise;
}

export function initializeOutputAudioContext(): AudioContext {
    if (!outputAudioContext || outputAudioContext.state === 'closed') {
        outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextStartTime = 0;
        sources.clear();
    }
    return outputAudioContext;
}

/**
 * Merges multiple base64 PCM audio chunks into a single PCM buffer
 */
function mergeAudioChunks(base64Chunks: string[]): Uint8Array {
    if (base64Chunks.length === 0) {
        return new Uint8Array(0);
    }
    if (base64Chunks.length === 1) {
        return decode(base64Chunks[0]);
    }

    // Decode all chunks
    const chunks = base64Chunks.map(chunk => decode(chunk));

    // Calculate total length
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);

    // Merge into single buffer
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }

    return merged;
}

/**
 * Plays the next audio in queue
 */
function playNextInQueue() {
    if (audioQueue.length === 0) {
        isPlaying = false;
        return;
    }

    const { url, rate } = audioQueue.shift()!;
    isPlaying = true;

    const audio = new Audio(url);
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    currentAudioElement = audio;

    audio.onended = () => {
        URL.revokeObjectURL(url); // Clean up blob URL
        currentAudioElement = null;
        playNextInQueue(); // Play next in queue
    };

    audio.onerror = (e) => {
        console.error('[playAudio] Error playing audio:', e);
        URL.revokeObjectURL(url);
        currentAudioElement = null;
        playNextInQueue(); // Try next in queue
    };

    audio.play().catch(err => {
        console.error('[playAudio] Failed to play audio:', err);
        URL.revokeObjectURL(url);
        currentAudioElement = null;
        playNextInQueue();
    });
}

export async function playAudio(base64Audio: string, speechRate: number) {
    // Store speech rate for later processing
    currentSpeechRate = speechRate;

    // Buffer the audio chunk (we'll play the complete turn when it's done)
    console.log('[playAudio] Buffering chunk, total chunks:', audioChunkBuffer.length + 1);
    audioChunkBuffer.push(base64Audio);
}

/**
 * Called when a complete audio turn is finished (turnComplete signal)
 * Merges all buffered chunks and plays with native playbackRate + preservesPitch
 */
export async function finishAudioTurn() {
    if (audioChunkBuffer.length === 0) {
        console.log('[finishAudioTurn] No buffered audio to process');
        return;
    }

    console.log('[finishAudioTurn] Processing', audioChunkBuffer.length, 'buffered chunks with rate:', currentSpeechRate);

    // Merge all buffered chunks into one PCM buffer
    const mergedPcm = mergeAudioChunks(audioChunkBuffer);
    audioChunkBuffer = []; // Clear buffer

    // Convert PCM to WAV and create blob URL
    const wavBuffer = pcmToWav(mergedPcm, 24000, 1); // 24kHz, mono
    const wavBlob = new window.Blob([wavBuffer], { type: 'audio/wav' });
    const blobUrl = URL.createObjectURL(wavBlob);

    // Add to queue and start playing if not already playing
    audioQueue.push({ url: blobUrl, rate: currentSpeechRate });

    if (!isPlaying) {
        playNextInQueue();
    }

    console.log('[finishAudioTurn] Queued audio for playback');
}

export function stopAllAudio() {
    // Clear buffered audio chunks
    audioChunkBuffer = [];

    // Stop current audio element
    if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
        currentAudioElement = null;
    }

    // Clear audio queue and revoke blob URLs
    for (const item of audioQueue) {
        URL.revokeObjectURL(item.url);
    }
    audioQueue = [];
    isPlaying = false;

    // Clean up old Web Audio API sources if any
    if (outputAudioContext) {
        for (const source of sources.values()) {
            source.stop();
            sources.delete(source);
        }
        nextStartTime = 0;
    }
}

export function cleanupAudio() {
    // Stop all audio playback
    stopAllAudio();

    if (scriptProcessor) {
        scriptProcessor.disconnect();
    }
    if (mediaStreamSource) {
        mediaStreamSource.disconnect();
    }
    if (inputAudioContext && inputAudioContext.state !== 'closed') {
        inputAudioContext.close();
    }
    if (outputAudioContext && outputAudioContext.state !== 'closed') {
        outputAudioContext.close();
    }
}