import * as postcss from 'postcss';
import { safeParse } from '@stylekit/css';

export type AnimationKeyframe = {
  offset: number;
  declarations: string;
};

export type AnimationConfig = {
  name: string;
  durationMs: number;
  delayMs: number;
  timingFunction: string;
  iterationCount: string;
  direction: string;
  fillMode: string;
  keyframes: AnimationKeyframe[];
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(
    maximum,
    Math.max(minimum, Number.isFinite(value) ? value : minimum)
  );

const getDeclarations = (value: string): postcss.ChildNode[] => {
  const root = postcss.parse(`.stylekit-keyframe { ${value} }`);
  const rule = root.first;
  if (!rule || rule.type !== 'rule') {
    throw new Error('Enter valid CSS declarations for this keyframe.');
  }
  const nodes = rule.nodes.filter(node => node.type !== 'comment');
  if (nodes.length === 0 || nodes.some(node => node.type !== 'decl')) {
    throw new Error('Keyframes can contain CSS declarations only.');
  }
  return nodes.map(node => node.clone());
};

export const getAnimationName = (selector: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < selector.length; index += 1) {
    hash ^= selector.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `stylekit-${(hash >>> 0).toString(36)}`;
};

export const buildAnimationShorthand = (config: AnimationConfig): string =>
  [
    config.name,
    `${clamp(config.durationMs, 1, 60_000)}ms`,
    config.timingFunction,
    `${clamp(config.delayMs, 0, 60_000)}ms`,
    config.iterationCount,
    config.direction,
    config.fillMode,
  ].join(' ');

export const buildKeyframesAtRule = (
  config: AnimationConfig
): postcss.AtRule => {
  const atRule = postcss.atRule({ name: 'keyframes', params: config.name });
  const byOffset = new Map<number, AnimationKeyframe>();
  config.keyframes.forEach(keyframe => {
    const offset = clamp(Math.round(keyframe.offset), 0, 100);
    byOffset.set(offset, { ...keyframe, offset });
  });
  [...byOffset.values()]
    .sort((left, right) => left.offset - right.offset)
    .forEach(keyframe => {
      const rule = postcss.rule({ selector: `${keyframe.offset}%` });
      rule.append(getDeclarations(keyframe.declarations));
      atRule.append(rule);
    });
  if (!atRule.nodes || atRule.nodes.length < 2) {
    throw new Error('An animation needs at least two distinct keyframes.');
  }
  return atRule;
};

const isInsideKeyframes = (rule: postcss.Rule): boolean => {
  const parent = rule.parent;
  return (
    parent?.type === 'atrule' &&
    /keyframes$/i.test((parent as postcss.AtRule).name)
  );
};

const splitAnimationList = (value: string): string[] => {
  const animations: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '(') depth += 1;
    if (character === ')') depth = Math.max(0, depth - 1);
    if (character === ',' && depth === 0) {
      animations.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  animations.push(value.slice(start).trim());
  return animations.filter(Boolean);
};

const containsAnimation = (value: string, animationName: string): boolean =>
  value.split(/\s+/).includes(animationName);

export const upsertAnimation = (
  css: string,
  selector: string,
  config: AnimationConfig
): string => {
  if (!selector.trim()) throw new Error('Select an element first.');
  const root = safeParse(css);
  let targetRule: postcss.Rule | undefined;
  root.walkRules(rule => {
    if (!targetRule && rule.selector === selector && !isInsideKeyframes(rule)) {
      targetRule = rule;
    }
  });
  if (!targetRule) {
    targetRule = postcss.rule({ selector });
    root.append(targetRule);
  }

  const shorthand = buildAnimationShorthand(config);
  const animationDeclaration = targetRule.nodes?.find(
    node => node.type === 'decl' && node.prop === 'animation'
  ) as postcss.Declaration | undefined;
  if (animationDeclaration) {
    const animations = splitAnimationList(animationDeclaration.value);
    const managedIndex = animations.findIndex(value =>
      containsAnimation(value, config.name)
    );
    if (managedIndex === -1) animations.push(shorthand);
    else animations[managedIndex] = shorthand;
    animationDeclaration.value = animations.join(', ');
  } else {
    targetRule.append({ prop: 'animation', value: shorthand });
  }

  const keyframes = buildKeyframesAtRule(config);
  let replaced = false;
  root.walkAtRules(/keyframes$/i, atRule => {
    if (!replaced && atRule.params.trim() === config.name) {
      atRule.replaceWith(keyframes);
      replaced = true;
    }
  });
  if (!replaced) root.append(keyframes);
  return root.toString();
};

export const removeAnimation = (
  css: string,
  selector: string,
  animationName: string
): string => {
  const root = safeParse(css);
  root.walkRules(rule => {
    if (rule.selector !== selector || isInsideKeyframes(rule)) return;
    rule.walkDecls('animation', declaration => {
      const remaining = splitAnimationList(declaration.value).filter(
        value => !containsAnimation(value, animationName)
      );
      if (remaining.length === 0) declaration.remove();
      else declaration.value = remaining.join(', ');
    });
    if (!rule.nodes || rule.nodes.length === 0) rule.remove();
  });
  root.walkAtRules(/keyframes$/i, atRule => {
    if (atRule.params.trim() === animationName) atRule.remove();
  });
  return root.toString();
};
