import { StylebotOptions } from '@stylekit/types';
import { getCachedOptions, setCachedOptions } from './cache';

export const getAll = async (): Promise<StylebotOptions> => {
  return getCachedOptions();
};

export const get = async (
  name: keyof StylebotOptions
): Promise<StylebotOptions[keyof StylebotOptions]> => {
  const options = await getAll();
  return options[name];
};

export const set = async (
  name: keyof StylebotOptions,
  value: StylebotOptions[keyof StylebotOptions]
): Promise<void> => {
  let options = await getAll();

  options = {
    ...options,
    [name]: value,
  };

  setCachedOptions(options);
  await chrome.storage.local.set({ options });
};
