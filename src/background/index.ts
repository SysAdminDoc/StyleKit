import './listeners';
import './cache';

import ContextMenu from './contextmenu';
import DefaultShortcutUpdate from './default-shortcut-update';
import StylesMetadataUpdate from './styles-metadata-update';
import StylesModifiedTimeUpdate from './styles-modified-time-update';

chrome.storage.session.setAccessLevel({
  accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
});

(async () => {
  await DefaultShortcutUpdate();
  await StylesMetadataUpdate();
  await StylesModifiedTimeUpdate();
})();

// Uninstall URL removed — will set up project-specific URL later
chrome.action.setBadgeBackgroundColor({
  color: '#555',
});

ContextMenu.init();
