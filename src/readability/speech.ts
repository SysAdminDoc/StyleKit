export type ReaderSpeechStatus = 'idle' | 'speaking' | 'paused';

export type ReaderSpeechState = {
  status: ReaderSpeechStatus;
  rate: number;
  chunk: number;
  totalChunks: number;
  error?: string;
};

type SpeechEngine = Pick<
  SpeechSynthesis,
  'speak' | 'pause' | 'resume' | 'cancel'
>;

type UtteranceFactory = (text: string) => SpeechSynthesisUtterance;

const MIN_RATE = 0.5;
const MAX_RATE = 2;
const DEFAULT_CHUNK_LENGTH = 220;
const MAX_CHUNKS = 2500;

export const normalizeSpeechRate = (value: number): number =>
  Math.min(MAX_RATE, Math.max(MIN_RATE, Math.round(value * 4) / 4));

export const createSpeechChunks = (
  value: string,
  maxLength = DEFAULT_CHUNK_LENGTH
): string[] => {
  const chunkLength = Math.max(1, Math.floor(maxLength));
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > chunkLength && chunks.length < MAX_CHUNKS - 1) {
    const window = remaining.slice(0, chunkLength + 1);
    const minimumBreak = Math.floor(chunkLength * 0.55);
    let breakAt = -1;
    for (const match of window.matchAll(/[.!?;:]\s+/g)) {
      const end = (match.index || 0) + match[0].length;
      if (end >= minimumBreak && end <= chunkLength) breakAt = end;
    }
    if (breakAt < minimumBreak) {
      breakAt = window.lastIndexOf(' ', chunkLength);
    }
    if (breakAt < 1) breakAt = chunkLength;
    chunks.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }

  if (remaining && chunks.length < MAX_CHUNKS) {
    chunks.push(remaining.slice(0, chunkLength));
  }
  return chunks;
};

export class ReaderSpeechController {
  private chunks: string[] = [];
  private chunkIndex = 0;
  private generation = 0;
  private status: ReaderSpeechStatus = 'idle';
  private rate = 1;

  constructor(
    private readonly engine: SpeechEngine,
    private readonly createUtterance: UtteranceFactory,
    private readonly onState: (state: ReaderSpeechState) => void
  ) {
    this.emit();
  }

  start(text: string, rate = this.rate): void {
    this.generation += 1;
    this.engine.cancel();
    this.chunks = createSpeechChunks(text);
    this.chunkIndex = 0;
    this.rate = normalizeSpeechRate(rate);
    if (!this.chunks.length) {
      this.status = 'idle';
      this.emit('There is no readable text to speak.');
      return;
    }
    this.status = 'speaking';
    this.emit();
    this.speakCurrent(this.generation);
  }

  pause(): void {
    if (this.status !== 'speaking') return;
    this.engine.pause();
    this.status = 'paused';
    this.emit();
  }

  resume(): void {
    if (this.status !== 'paused') return;
    this.engine.resume();
    this.status = 'speaking';
    this.emit();
  }

  stop(): void {
    this.generation += 1;
    this.engine.cancel();
    this.chunks = [];
    this.chunkIndex = 0;
    this.status = 'idle';
    this.emit();
  }

  setRate(value: number): void {
    const nextRate = normalizeSpeechRate(value);
    if (nextRate === this.rate) return;
    this.rate = nextRate;
    if (this.status === 'idle') {
      this.emit();
      return;
    }

    const wasPaused = this.status === 'paused';
    this.generation += 1;
    this.engine.cancel();
    this.status = 'speaking';
    this.emit();
    this.speakCurrent(this.generation);
    if (wasPaused) this.pause();
  }

  private speakCurrent(generation: number): void {
    const text = this.chunks[this.chunkIndex];
    if (!text || generation !== this.generation) return;
    const utterance = this.createUtterance(text);
    utterance.rate = this.rate;
    utterance.onend = () => {
      if (generation !== this.generation || this.status === 'idle') return;
      this.chunkIndex += 1;
      if (this.chunkIndex >= this.chunks.length) {
        this.status = 'idle';
        this.emit();
        return;
      }
      this.emit();
      this.speakCurrent(generation);
    };
    utterance.onerror = event => {
      if (generation !== this.generation) return;
      this.status = 'idle';
      this.emit(
        event.error === 'canceled'
          ? undefined
          : `Speech playback failed (${event.error}).`
      );
    };
    this.engine.speak(utterance);
  }

  private emit(error?: string): void {
    this.onState({
      status: this.status,
      rate: this.rate,
      chunk: this.chunks.length
        ? Math.min(this.chunkIndex + 1, this.chunks.length)
        : 0,
      totalChunks: this.chunks.length,
      error,
    });
  }
}
