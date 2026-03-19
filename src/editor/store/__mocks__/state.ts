import { State } from '..';

import {
  defaultOptions,
  defaultReadabilitySettings,
  defaultCommands,
  defaultEditorCommands,
} from '@stylekit/settings';

const mockState: State = {
  css: '',
  enabled: true,
  url: document.domain,

  selectors: [],
  activeSelector: '',
  contextMenuSelector: '',

  help: false,
  visible: false,
  inspecting: false,
  resizing: false,
  readability: false,
  colorPickerVisible: false,

  options: defaultOptions,
  commands: defaultCommands,
  editorCommands: defaultEditorCommands,
  readabilitySettings: defaultReadabilitySettings,

  cssHistory: [''],
  cssHistoryIndex: 0,
};

export default mockState;
