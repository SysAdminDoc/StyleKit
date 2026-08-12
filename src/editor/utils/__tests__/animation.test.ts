import {
  buildAnimationShorthand,
  getAnimationName,
  removeAnimation,
  upsertAnimation,
  type AnimationConfig,
} from '../animation';

const config: AnimationConfig = {
  name: 'stylekit-demo',
  durationMs: 800,
  delayMs: 100,
  timingFunction: 'ease-in-out',
  iterationCount: 'infinite',
  direction: 'alternate',
  fillMode: 'both',
  keyframes: [
    { offset: 100, declarations: 'opacity: 1; transform: translateY(0);' },
    { offset: 0, declarations: 'opacity: 0; transform: translateY(12px);' },
    { offset: 50, declarations: 'opacity: .5;' },
  ],
};

describe('animation CSS generation', () => {
  it('creates deterministic selector-scoped animation names', () => {
    expect(getAnimationName('#card')).toBe(getAnimationName('#card'));
    expect(getAnimationName('#card')).not.toBe(getAnimationName('#button'));
    expect(getAnimationName('#card')).toMatch(/^stylekit-[a-z0-9]+$/);
  });

  it('builds a complete animation shorthand', () => {
    expect(buildAnimationShorthand(config)).toBe(
      'stylekit-demo 800ms ease-in-out 100ms infinite alternate both'
    );
  });

  it('upserts sorted keyframes and replaces the managed animation', () => {
    const first = upsertAnimation('#card { color: red; }', '#card', config);
    expect(first).toContain(
      'animation: stylekit-demo 800ms ease-in-out 100ms infinite alternate both'
    );
    expect(first.indexOf('0%')).toBeLessThan(first.indexOf('50%'));
    expect(first.indexOf('50%')).toBeLessThan(first.indexOf('100%'));

    const updated = upsertAnimation(first, '#card', {
      ...config,
      durationMs: 1200,
    });
    expect(updated.match(/@keyframes stylekit-demo/g)).toHaveLength(1);
    expect(updated).toContain('stylekit-demo 1200ms');
  });

  it('removes only the selected managed animation', () => {
    const css = upsertAnimation(
      '#card { color: red; animation: spin 2s cubic-bezier(0, .5, .5, 1); }',
      '#card',
      config
    );
    expect(css).toContain(
      'spin 2s cubic-bezier(0, .5, .5, 1), stylekit-demo 800ms'
    );
    const removed = removeAnimation(css, '#card', config.name);
    expect(removed).toContain('color: red');
    expect(removed).toContain('animation: spin 2s cubic-bezier(0, .5, .5, 1)');
    expect(removed).not.toContain('stylekit-demo 800ms');
    expect(removed).not.toContain('@keyframes stylekit-demo');
  });

  it('rejects invalid keyframe bodies and duplicate-only timelines', () => {
    expect(() =>
      upsertAnimation('', '#card', {
        ...config,
        keyframes: [
          { offset: 0, declarations: 'opacity: 0;' },
          { offset: 0, declarations: 'opacity: 1;' },
        ],
      })
    ).toThrow('at least two distinct keyframes');
    expect(() =>
      upsertAnimation('', '#card', {
        ...config,
        keyframes: [
          { offset: 0, declarations: '@media print {}' },
          { offset: 100, declarations: 'opacity: 1;' },
        ],
      })
    ).toThrow();
  });
});
