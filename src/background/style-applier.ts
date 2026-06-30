import { Style } from '@stylekit/types';

type StyleTarget = {
  tabId: number;
  frameId?: number;
  allFrames?: boolean;
};

const appliedCss = new Map<string, string>();

const getTargetKey = (target: StyleTarget, id: string): string => {
  const frame = target.allFrames ? 'all' : target.frameId ?? 0;
  return `${target.tabId}:${frame}:${id}`;
};

const getTargetPrefix = (target: StyleTarget): string => {
  const frame = target.allFrames ? 'all' : target.frameId ?? 0;
  return `${target.tabId}:${frame}:`;
};

const getScriptingTarget = (
  target: StyleTarget
): chrome.scripting.InjectionTarget => {
  if (target.allFrames) {
    return {
      tabId: target.tabId,
      allFrames: true,
    };
  }

  return {
    tabId: target.tabId,
    frameIds: [target.frameId ?? 0],
  };
};

const canUseScriptingCss = (): boolean =>
  Boolean(chrome.scripting?.insertCSS && chrome.scripting?.removeCSS);

const removeUserOriginCss = async (
  target: StyleTarget,
  id: string,
  css?: string
): Promise<void> => {
  const key = getTargetKey(target, id);
  const currentCss = css ?? appliedCss.get(key);

  if (!currentCss) return;

  await chrome.scripting.removeCSS({
    target: getScriptingTarget(target),
    css: currentCss,
    origin: 'USER',
  });

  appliedCss.delete(key);
};

export const applyUserOriginCss = async (
  target: StyleTarget,
  id: string,
  css: string
): Promise<boolean> => {
  if (!canUseScriptingCss()) return false;

  const key = getTargetKey(target, id);
  const currentCss = appliedCss.get(key);

  try {
    if (currentCss && currentCss !== css) {
      await removeUserOriginCss(target, id, currentCss);
    }

    if (!css.trim()) {
      await removeUserOriginCss(target, id);
      return true;
    }

    if (currentCss === css) return true;

    await chrome.scripting.insertCSS({
      target: getScriptingTarget(target),
      css,
      origin: 'USER',
    });

    appliedCss.set(key, css);
    return true;
  } catch (error) {
    console.debug('StyleKit: USER-origin CSS insertion unavailable', error);
    return false;
  }
};

export const removeAppliedUserOriginCss = async (
  target: StyleTarget,
  id: string
): Promise<boolean> => {
  if (!canUseScriptingCss()) return false;

  try {
    await removeUserOriginCss(target, id);
    return true;
  } catch (error) {
    console.debug('StyleKit: USER-origin CSS removal unavailable', error);
    return false;
  }
};

export const replaceUserOriginCss = async (
  target: StyleTarget,
  id: string,
  oldCss: string | undefined,
  newCss: string
): Promise<boolean> => {
  if (!canUseScriptingCss()) return false;

  try {
    if (oldCss) {
      await removeUserOriginCss(target, id, oldCss);
    }

    appliedCss.delete(getTargetKey(target, id));
    return applyUserOriginCss(target, id, newCss);
  } catch (error) {
    console.debug('StyleKit: USER-origin CSS replacement unavailable', error);
    return false;
  }
};

export const applyUserOriginStylesToFrame = async (
  tabId: number,
  frameId: number,
  styles: Style[]
): Promise<boolean> => {
  const target = { tabId, frameId };
  const expectedStyleIds = new Set(
    styles
      .filter(style => style.enabled && style.css.trim())
      .map(style => style.url)
  );
  let applied = true;

  for (const key of appliedCss.keys()) {
    const prefix = getTargetPrefix(target);
    if (!key.startsWith(prefix)) continue;

    const styleId = key.slice(prefix.length);
    if (styleId.startsWith('preview:') || expectedStyleIds.has(styleId)) {
      continue;
    }

    const removed = await removeAppliedUserOriginCss(target, styleId);
    applied = removed && applied;
  }

  for (const style of styles) {
    if (!style.enabled || !style.css.trim()) {
      const removed = await removeAppliedUserOriginCss(target, style.url);
      applied = removed && applied;
      continue;
    }

    const styleApplied = await applyUserOriginCss(target, style.url, style.css);
    applied = styleApplied && applied;
  }

  return applied;
};

export const applyUserOriginPreviewToTab = (
  tabId: number,
  id: string,
  css: string
): Promise<boolean> =>
  applyUserOriginCss({ tabId, allFrames: true }, `preview:${id}`, css);

export const removeUserOriginPreviewFromTab = (
  tabId: number,
  id: string
): Promise<boolean> =>
  removeAppliedUserOriginCss({ tabId, allFrames: true }, `preview:${id}`);

export const resetUserOriginCssForTests = (): void => {
  appliedCss.clear();
};
