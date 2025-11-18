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
 * Stretches the duration of an AudioBuffer without changing its pitch, using a
 * robust Synchronous Overlap-Add (SOLA) method. This version ensures the entire
 * input is processed to prevent audio from being cut off.
 * @param audioBuffer The audio buffer to process.
 * @param rate The desired speed multiplier (e.g., 1.5 for 50% faster, 0.75 for 25% slower).
 * @param ctx The AudioContext, used to create the output buffer.
 * @returns A new AudioBuffer with the stretched audio.
 */
function timeStretch(
  audioBuffer: AudioBuffer,
  rate: number,
  ctx: AudioContext
): AudioBuffer {
  const inputData = audioBuffer.getChannelData(0);
  const inputLength = inputData.length;
  const sampleRate = audioBuffer.sampleRate;

  const grainSize = 2048; // A good size for speech, balances quality and performance.
  const hopSize = grainSize / 2; // Use 50% overlap for smooth blending with a Hanning window.

  // Create a Hanning window to apply to each grain to avoid clicking artifacts.
  const window = new Float32Array(grainSize);
  for (let i = 0; i < grainSize; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (grainSize - 1)));
  }
  
  // Estimate output length and create a buffer large enough to hold the result.
  const estimatedOutputLength = Math.ceil(inputLength / rate);
  const outputData = new Float32Array(estimatedOutputLength + grainSize);

  let outputPointer = 0;
  let inputPointer = 0.0;
  let actualOutputLength = 0;

  // Main processing loop: continue as long as our input pointer is within the bounds of the input data.
  while (inputPointer < inputLength) {
    const i_inputPointer = Math.floor(inputPointer);

    // Create a grain buffer to hold a chunk of the input.
    const grain = new Float32Array(grainSize);
    
    // Copy data from the input into the grain, applying the window function.
    // If we read past the end of the input, the rest of the grain will be zeros (silent).
    for (let i = 0; i < grainSize; i++) {
      if (i_inputPointer + i < inputLength) {
        grain[i] = inputData[i_inputPointer + i] * window[i];
      } else {
        grain[i] = 0; // Zero-pad the end.
      }
    }

    // Overlap-add the processed grain into the output buffer.
    for (let i = 0; i < grainSize; i++) {
      // Ensure we don't write past the allocated output buffer.
      if (outputPointer + i < outputData.length) {
        outputData[outputPointer + i] += grain[i];
      }
    }
    
    // Update the actual length of the output signal based on the last write position.
    actualOutputLength = outputPointer + grainSize;

    // Advance the pointers for the next iteration.
    outputPointer += hopSize;
    inputPointer += hopSize * rate;
  }
  
  // If no audio was processed, return a tiny silent buffer to avoid errors.
  if (actualOutputLength === 0) {
      return ctx.createBuffer(1, 1, sampleRate);
  }

  // Trim the output buffer to the exact length of the audio data we generated.
  const trimmedOutput = outputData.subarray(0, actualOutputLength);

  // Create the final, correctly sized AudioBuffer.
  const finalBuffer = ctx.createBuffer(1, trimmedOutput.length, sampleRate);
  finalBuffer.copyToChannel(trimmedOutput, 0);

  return finalBuffer;
}


// --- Gemini Live Service ---

let inputAudioContext: AudioContext;
let outputAudioContext: AudioContext;
let scriptProcessor: ScriptProcessorNode;
let mediaStreamSource: MediaStreamAudioSourceNode;
let nextStartTime = 0;
const sources = new Set<AudioBufferSourceNode>();

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

export async function playAudio(base64Audio: string, speechRate: number) {
    const oac = initializeOutputAudioContext();
    nextStartTime = Math.max(nextStartTime, oac.currentTime);
    
    let audioBuffer = await decodeAudioData(
        decode(base64Audio),
        oac,
        24000,
        1,
    );

    // If the speech rate is not the default, apply our time-stretching algorithm.
    if (speechRate !== 1.0 && speechRate > 0) {
      try {
        audioBuffer = timeStretch(audioBuffer, speechRate, oac);
      } catch (e) {
        console.error("Failed to time-stretch audio, playing at normal speed.", e);
      }
    }

    const source = oac.createBufferSource();
    source.buffer = audioBuffer;
    // We no longer change playbackRate, as the buffer itself has been modified.
    source.connect(oac.destination);
    
    source.addEventListener('ended', () => {
        sources.delete(source);
    });

    source.start(nextStartTime);
    // The duration of the audio buffer is now correct for the new speed.
    nextStartTime += audioBuffer.duration;
    sources.add(source);
}

export function stopAllAudio() {
    if (outputAudioContext) {
        for (const source of sources.values()) {
            source.stop();
            sources.delete(source);
        }
        nextStartTime = 0;
    }
}

export function cleanupAudio() {
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