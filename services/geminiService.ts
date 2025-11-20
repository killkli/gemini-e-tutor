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

// Audio chunk buffering for streaming with mini-batches
let audioChunkBuffer: string[] = []; // Store base64 audio data for mini-batch
let currentSpeechRate: number = 1.0;

// Audio playback queue and state
let audioQueue: Array<{ url: string; rate: number }> = [];
let currentAudioElement: HTMLAudioElement | null = null;
let isPlaying: boolean = false;

// Mini-batch streaming configuration (dynamically adjusted based on speech rate)
const BASE_BATCH_SIZE = 12; // Larger batches = smoother playback, fewer glitches
const BASE_BATCH_TIMEOUT = 500; // Longer timeout for more complete batches
let chunkBatchTimer: ReturnType<typeof setTimeout> | null = null;

// Calculate dynamic batch parameters based on speech rate
function getBatchConfig(speechRate: number) {
    // Key insight: slower speech = each chunk plays LONGER
    // So we need MORE chunks to compensate, otherwise queue builds up
    // Formula: multiply by inverse of speech rate for balance
    const adjustedSize = Math.ceil(BASE_BATCH_SIZE / speechRate);
    const adjustedTimeout = Math.ceil(BASE_BATCH_TIMEOUT / speechRate);

    return {
        batchSize: Math.max(8, adjustedSize), // Minimum 8 chunks
        timeout: Math.max(400, adjustedTimeout) // Minimum 400ms
    };
}



export interface ConnectToGeminiLiveParams {
    stream: MediaStream;
    systemPrompt: string;
    apiKey: string;
    voiceModel: string;
    onMessage: (message: LiveServerMessage) => void;
    onError: (e: ErrorEvent) => void;
    onClose: (e: CloseEvent) => void;
    onOpen: () => void;
}

export async function connectToGeminiLive({
    stream,
    systemPrompt,
    apiKey,
    voiceModel,
    onMessage,
    onError,
    onClose,
    onOpen
}: ConnectToGeminiLiveParams): Promise<Session> {
    if (!apiKey) {
        throw new Error("API key not provided");
    }
    const ai = new GoogleGenAI({ apiKey });

    const sessionPromise = ai.live.connect({
        model: voiceModel,
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

// Flush buffered chunks and schedule for seamless Web Audio API playback
function flushAudioBatch() {
    if (audioChunkBuffer.length === 0) {
        return;
    }

    console.log('[flushAudioBatch] Flushing', audioChunkBuffer.length, 'chunks with rate:', currentSpeechRate);

    // Merge buffered chunks
    const mergedPcm = mergeAudioChunks(audioChunkBuffer);
    audioChunkBuffer = []; // Clear buffer

    // Clear the timeout
    if (chunkBatchTimer) {
        clearTimeout(chunkBatchTimer);
        chunkBatchTimer = null;
    }

    // Convert to WAV and create blob URL
    const wavBuffer = pcmToWav(mergedPcm, 24000, 1);
    const wavBlob = new window.Blob([wavBuffer], { type: 'audio/wav' });
    const blobUrl = URL.createObjectURL(wavBlob);

    // Add to queue
    audioQueue.push({ url: blobUrl, rate: currentSpeechRate });

    if (!isPlaying) {
        playNextInQueue();
    }

    console.log('[flushAudioBatch] Queued audio, queue length:', audioQueue.length);
}

// Play next audio in queue with precise timing to minimize gaps
function playNextInQueue() {
    if (audioQueue.length === 0) {
        isPlaying = false;
        console.log('[playNextInQueue] Queue empty');
        return;
    }

    const { url, rate } = audioQueue.shift()!;
    isPlaying = true;

    const audio = new Audio(url);
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    currentAudioElement = audio;

    let hasTriggeredNext = false;

    console.log('[playNextInQueue] Playing audio with rate:', rate, 'queue remaining:', audioQueue.length);

    // Monitor playback progress to trigger next audio early
    audio.ontimeupdate = () => {
        if (hasTriggeredNext) return;

        const remaining = audio.duration - audio.currentTime;

        // Start next audio when 30ms remaining to eliminate gap
        if (remaining <= 0.03 && audioQueue.length > 0) {
            hasTriggeredNext = true;
            console.log('[playNextInQueue] Triggering next audio early, remaining:', remaining.toFixed(3), 's');
            playNextInQueue();
        }
    };

    audio.onended = () => {
        console.log('[playNextInQueue] Audio ended');
        URL.revokeObjectURL(url);
        currentAudioElement = null;

        // Only trigger next if we didn't already do it early
        if (!hasTriggeredNext && audioQueue.length > 0) {
            playNextInQueue();
        } else if (audioQueue.length === 0) {
            isPlaying = false;
        }
    };

    audio.onerror = (e) => {
        console.error('[playNextInQueue] Error:', e);
        URL.revokeObjectURL(url);
        currentAudioElement = null;
        if (!hasTriggeredNext) {
            playNextInQueue();
        }
    };

    audio.play().catch(err => {
        console.error('[playNextInQueue] Failed to play:', err);
        URL.revokeObjectURL(url);
        currentAudioElement = null;
        if (!hasTriggeredNext) {
            playNextInQueue();
        }
    });
}

export async function playAudio(base64Audio: string, speechRate: number) {
    // Store speech rate for current playback
    currentSpeechRate = speechRate;

    // Get dynamic batch configuration based on speech rate
    const { batchSize, timeout } = getBatchConfig(speechRate);

    // Add chunk to buffer
    audioChunkBuffer.push(base64Audio);
    console.log('[playAudio] Buffered chunk', audioChunkBuffer.length + '/' + batchSize, 'rate:', speechRate, 'timeout:', timeout + 'ms');

    // Clear existing timeout
    if (chunkBatchTimer) {
        clearTimeout(chunkBatchTimer);
    }

    // If buffer reaches dynamic batch size, flush immediately
    if (audioChunkBuffer.length >= batchSize) {
        flushAudioBatch();
    } else {
        // Otherwise set timeout based on speech rate to flush after delay
        chunkBatchTimer = setTimeout(() => {
            console.log('[playAudio] Batch timeout reached, flushing', audioChunkBuffer.length, 'chunks');
            flushAudioBatch();
        }, timeout);
    }
}

/**
 * Called when a complete audio turn is finished (turnComplete signal)
 * Merges all buffered chunks and plays with native playbackRate + preservesPitch
 */
export async function finishAudioTurn() {
    // Flush any remaining buffered chunks when turn is complete
    console.log('[finishAudioTurn] Turn complete, flushing remaining chunks');

    // Clear timeout if any
    if (chunkBatchTimer) {
        clearTimeout(chunkBatchTimer);
        chunkBatchTimer = null;
    }

    // Flush remaining chunks
    flushAudioBatch();

    console.log('[finishAudioTurn] Audio turn complete');
}

export function stopAllAudio() {
    // Clear batch timer
    if (chunkBatchTimer) {
        clearTimeout(chunkBatchTimer);
        chunkBatchTimer = null;
    }

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

    console.log('[stopAllAudio] All audio stopped and queue cleared');
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