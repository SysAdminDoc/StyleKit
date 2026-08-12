import {
  createSpeechChunks,
  normalizeSpeechRate,
  ReaderSpeechController,
  type ReaderSpeechState,
} from '../speech';

type FakeUtterance = {
  text: string;
  rate: number;
  onend: SpeechSynthesisUtterance['onend'];
  onerror: SpeechSynthesisUtterance['onerror'];
};

const createHarness = () => {
  const utterances: FakeUtterance[] = [];
  const states: ReaderSpeechState[] = [];
  const engine = {
    speak: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
  };
  const controller = new ReaderSpeechController(
    engine,
    text => {
      const utterance: FakeUtterance = {
        text,
        rate: 1,
        onend: null,
        onerror: null,
      };
      utterances.push(utterance);
      return utterance as unknown as SpeechSynthesisUtterance;
    },
    state => states.push(state)
  );

  return { controller, engine, states, utterances };
};

const finish = (utterance: FakeUtterance): void => {
  const onend = utterance.onend as
    | ((event: SpeechSynthesisEvent) => void)
    | null;
  onend?.({} as SpeechSynthesisEvent);
};

describe('reader speech', () => {
  it('creates bounded, whitespace-normalized chunks at natural breaks', () => {
    const text = `${'Opening words '.repeat(4)}finish. ${'Closing words '.repeat(
      4
    )}finish.`;
    const chunks = createSpeechChunks(text, 70);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => chunk.length <= 70)).toBe(true);
    expect(chunks[0]).toMatch(/[.!?;:]$/);
    expect(chunks.join(' ')).toBe(text.replace(/\s+/g, ' ').trim());
  });

  it('splits long unbroken text and constrains speech rates', () => {
    expect(createSpeechChunks('a'.repeat(25), 10)).toEqual([
      'a'.repeat(10),
      'a'.repeat(10),
      'a'.repeat(5),
    ]);
    const cappedChunks = createSpeechChunks('a'.repeat(2505), 1);
    expect(cappedChunks).toHaveLength(2500);
    expect(cappedChunks.every(chunk => chunk.length === 1)).toBe(true);
    expect(normalizeSpeechRate(0.1)).toBe(0.5);
    expect(normalizeSpeechRate(1.37)).toBe(1.25);
    expect(normalizeSpeechRate(4)).toBe(2);
  });

  it('speaks chunks in order and returns to idle when complete', () => {
    const { controller, engine, states, utterances } = createHarness();
    controller.start('a'.repeat(221), 1.5);

    expect(engine.cancel).toHaveBeenCalledOnce();
    expect(utterances[0]).toMatchObject({ text: 'a'.repeat(220), rate: 1.5 });
    expect(states.at(-1)).toMatchObject({
      status: 'speaking',
      chunk: 1,
      totalChunks: 2,
    });

    finish(utterances[0]);
    expect(utterances[1]).toMatchObject({ text: 'a', rate: 1.5 });
    finish(utterances[1]);
    expect(states.at(-1)).toMatchObject({
      status: 'idle',
      chunk: 2,
      totalChunks: 2,
    });
  });

  it('pauses, resumes, and restarts the current chunk after a rate change', () => {
    const { controller, engine, states, utterances } = createHarness();
    controller.start('Readable article text');
    controller.pause();
    controller.resume();
    controller.setRate(1.75);

    expect(engine.pause).toHaveBeenCalledOnce();
    expect(engine.resume).toHaveBeenCalledOnce();
    expect(engine.cancel).toHaveBeenCalledTimes(2);
    expect(utterances).toHaveLength(2);
    expect(utterances[1]).toMatchObject({
      text: 'Readable article text',
      rate: 1.75,
    });
    expect(states.at(-1)).toMatchObject({ status: 'speaking', rate: 1.75 });
  });

  it('cancels playback and ignores completion from an old utterance', () => {
    const { controller, engine, states, utterances } = createHarness();
    controller.start('Readable article text');
    const staleUtterance = utterances[0];
    controller.stop();
    finish(staleUtterance);

    expect(engine.cancel).toHaveBeenCalledTimes(2);
    expect(utterances).toHaveLength(1);
    expect(states.at(-1)).toMatchObject({
      status: 'idle',
      chunk: 0,
      totalChunks: 0,
    });
  });
});
