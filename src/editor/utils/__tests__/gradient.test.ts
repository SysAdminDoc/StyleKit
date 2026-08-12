import {
  buildGradient,
  buildGradientDeclaration,
  type GradientConfig,
} from '../gradient';

const makeConfig = (
  overrides: Partial<GradientConfig> = {}
): GradientConfig => ({
  type: 'linear',
  angle: 45,
  radialShape: 'circle',
  centerX: 50,
  centerY: 50,
  stops: [
    { color: '#cba6f7', position: 100 },
    { color: '#89b4fa', position: 0 },
  ],
  ...overrides,
});

describe('gradient CSS generation', () => {
  it('sorts stops and builds linear CSS', () => {
    expect(buildGradient(makeConfig())).toBe(
      'linear-gradient(45deg, #89b4fa 0%, #cba6f7 100%)'
    );
  });

  it('builds positioned radial and conic gradients', () => {
    expect(
      buildGradient(
        makeConfig({
          type: 'radial',
          radialShape: 'ellipse',
          centerX: 25,
          centerY: 75,
        })
      )
    ).toBe('radial-gradient(ellipse at 25% 75%, #89b4fa 0%, #cba6f7 100%)');
    expect(
      buildGradient(
        makeConfig({ type: 'conic', angle: -45, centerX: 20, centerY: 30 })
      )
    ).toBe('conic-gradient(from 315deg at 20% 30%, #89b4fa 0%, #cba6f7 100%)');
  });

  it('clamps positions and produces a copy-ready declaration', () => {
    const config = makeConfig({
      angle: 405,
      stops: [
        { color: 'red', position: -10 },
        { color: 'blue', position: 120 },
      ],
    });
    expect(buildGradientDeclaration(config)).toBe(
      'background-image: linear-gradient(45deg, red 0%, blue 100%);'
    );
  });
});
