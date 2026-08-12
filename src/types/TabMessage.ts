import { ReadabilitySettings, Style } from '@stylekit/types';

export type ToggleStylebot = {
  name: 'ToggleStylebot';
};

export type OpenStylebot = {
  name: 'OpenStylebot';
};

export type OpenStylebotInCodeMode = {
  name: 'OpenStylebotInCodeMode';
};

export type OpenStylebotFromContextMenu = {
  name: 'OpenStylebotFromContextMenu';
};

export type ToggleReadabilityForTab = {
  name: 'ToggleReadabilityForTab';
};

export type CaptureReadingListArticle = {
  name: 'CaptureReadingListArticle';
};

export type ApplyStylesToTab = {
  name: 'ApplyStylesToTab';
  defaultStyle?: Style;
  styles: Style[];
  userOriginApplied?: boolean;
};

export type TabUpdated = {
  name: 'TabUpdated';
};

export type GetIsStylebotOpen = {
  name: 'GetIsStylebotOpen';
};

export type HideElementFromContextMenu = {
  name: 'HideElementFromContextMenu';
};

export type UpdateReader = {
  name: 'UpdateReader';
  value: ReadabilitySettings;
};

export type PreviewStyle = {
  name: 'PreviewStyle';
  id: string;
  css: string;
};

export type RemovePreviewStyle = {
  name: 'RemovePreviewStyle';
  id: string;
};

type TabMessage =
  | ToggleStylebot
  | OpenStylebot
  | OpenStylebotInCodeMode
  | OpenStylebotFromContextMenu
  | ToggleReadabilityForTab
  | CaptureReadingListArticle
  | ApplyStylesToTab
  | TabUpdated
  | GetIsStylebotOpen
  | HideElementFromContextMenu
  | UpdateReader
  | PreviewStyle
  | RemovePreviewStyle;

export default TabMessage;
