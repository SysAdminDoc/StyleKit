import { getCurrentTimestamp } from '@stylekit/utils';

const StylesModifiedTimeUpdate = async (): Promise<void> => {
  const items = await chrome.storage.local.get('styles');

  if (items['styles']) {
    const styles = items['styles'];

    for (const url in styles) {
      const style = styles[url];

      if (!style.modifiedTime) {
        styles[url].modifiedTime = getCurrentTimestamp();
      }
    }

    await chrome.storage.local.set({ styles });
  }
};

export default StylesModifiedTimeUpdate;
