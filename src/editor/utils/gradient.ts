export type GradientType = 'linear' | 'radial' | 'conic';
export type RadialGradientShape = 'circle' | 'ellipse';

export type GradientStop = {
  color: string;
  position: number;
};

export type GradientConfig = {
  type: GradientType;
  angle: number;
  radialShape: RadialGradientShape;
  centerX: number;
  centerY: number;
  stops: GradientStop[];
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(
    maximum,
    Math.max(minimum, Number.isFinite(value) ? value : minimum)
  );

export const normalizeGradientAngle = (angle: number): number =>
  ((Math.round(angle) % 360) + 360) % 360;

export const buildGradient = (config: GradientConfig): string => {
  const stops = [...config.stops]
    .sort((left, right) => left.position - right.position)
    .map(stop => `${stop.color} ${clamp(stop.position, 0, 100)}%`)
    .join(', ');
  const angle = normalizeGradientAngle(config.angle);
  const center = `at ${clamp(config.centerX, 0, 100)}% ${clamp(config.centerY, 0, 100)}%`;

  if (config.type === 'radial') {
    return `radial-gradient(${config.radialShape} ${center}, ${stops})`;
  }
  if (config.type === 'conic') {
    return `conic-gradient(from ${angle}deg ${center}, ${stops})`;
  }
  return `linear-gradient(${angle}deg, ${stops})`;
};

export const buildGradientDeclaration = (config: GradientConfig): string =>
  `background-image: ${buildGradient(config)};`;
