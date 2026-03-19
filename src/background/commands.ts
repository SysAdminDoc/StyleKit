import { defaultCommands } from '@stylekit/settings';
import { StylebotCommands } from '@stylekit/types';

export const get = async (): Promise<StylebotCommands> => {
  const items = await chrome.storage.local.get('commands');
  return items['commands'] || defaultCommands;
};

export const set = async (value: StylebotCommands): Promise<void> => {
  await chrome.storage.local.set({ commands: value });
};
