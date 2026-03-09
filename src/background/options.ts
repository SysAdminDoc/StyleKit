import { StylebotOptions } from '@stylebot/types';
import { defaultOptions } from '@stylebot/settings';

export const getAll = async (): Promise<StylebotOptions> => {
  const items = await chrome.storage.local.get('options');
  return items['options'] || defaultOptions;
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

  await chrome.storage.local.set({ options });
};
