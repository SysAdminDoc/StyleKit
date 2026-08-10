import { getCurrentTimestamp } from '@stylekit/utils';
import {
  getAllStylesFromStorage,
  setAllStylesInStorage,
} from './style-storage';

const StylesModifiedTimeUpdate = async (): Promise<void> => {
  const styles = await getAllStylesFromStorage();
  let changed = false;

  for (const url in styles) {
    const style = styles[url];

    if (!style.modifiedTime) {
      styles[url].modifiedTime = getCurrentTimestamp();
      changed = true;
    }
  }

  if (changed) {
    await setAllStylesInStorage(styles);
  }
};

export default StylesModifiedTimeUpdate;
