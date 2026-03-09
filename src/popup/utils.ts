import {
  ToggleStylebot,
  GetStylesForPage,
  GetIsStylebotOpen,
  GetStylesForPageResponse,
} from '@stylebot/types';

export const getCurrentTab = async (): Promise<chrome.tabs.Tab | undefined> => {
  const window = await chrome.windows.getCurrent({ populate: true });
  if (window.tabs) {
    return window.tabs.find(tab => tab.active);
  }
};

export const getStyles = async (
  tab: chrome.tabs.Tab
): Promise<GetStylesForPageResponse> => {
  const message: GetStylesForPage = {
    name: 'GetStylesForPage',
    tab,
  };

  return chrome.runtime.sendMessage(message);
};

export const getIsStylebotOpen = async (
  tab: chrome.tabs.Tab
): Promise<boolean> => {
  if (tab.id) {
    const message: GetIsStylebotOpen = {
      name: 'GetIsStylebotOpen',
    };

    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (e) {
      return false;
    }
  }

  return false;
};

export const toggleStylebot = (tab: chrome.tabs.Tab): void => {
  if (tab.id) {
    const message: ToggleStylebot = {
      name: 'ToggleStylebot',
    };

    chrome.tabs.sendMessage(tab.id, message).catch(() => {
      // Content script not available on this tab
    });
    window.close();
  }
};
