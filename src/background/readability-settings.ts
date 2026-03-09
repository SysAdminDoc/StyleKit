import { defaultReadabilitySettings } from '@stylebot/settings';
import { ReadabilitySettings, UpdateReader } from '@stylebot/types';

export const get = async (): Promise<ReadabilitySettings> => {
  const items = await chrome.storage.local.get('readability-settings');
  const settings = items['readability-settings'];
  return settings || defaultReadabilitySettings;
};

export const set = async (value: ReadabilitySettings): Promise<void> => {
  await chrome.storage.local.set({ 'readability-settings': value });

  const tabs = await chrome.tabs.query({ active: true });
  const tab = tabs[0];
  if (tab && tab.url && tab.id) {
    const message: UpdateReader = {
      name: 'UpdateReader',
      value,
    };

    chrome.tabs.sendMessage(tab.id, message).catch(() => {});
  }
};
