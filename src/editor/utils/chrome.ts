import {
  SetOption,
  GetAllOptions,
  OpenOptionsPage,
  SetStyle,
  EnableStyle,
  DisableStyle,
  GetStylesForPage,
  SetReadability,
  GetCommands,
  GetStylesForPageResponse,
  GetCommandsResponse,
  StylebotOptions,
  GetReadabilitySettingsResponse,
  GetReadabilitySettings,
  SetReadabilitySettings,
  ReadabilitySettings,
  OpenDonatePage,
  GetEditorOnboardingDone,
  GetEditorOnboardingDoneResponse,
  SetEditorOnboardingDone,
  GetGoogleFontsCache,
  GetGoogleFontsCacheResponse,
  SetGoogleFontsCache,
  GoogleFontsCache,
  DiagnosticCategory,
  RecordDiagnostic,
} from '@stylekit/types';

export const getAllOptions = async (): Promise<StylebotOptions> => {
  const message: GetAllOptions = {
    name: 'GetAllOptions',
  };

  return chrome.runtime.sendMessage(message);
};

export const setOption = (
  name: keyof StylebotOptions,
  value: StylebotOptions[keyof StylebotOptions]
): void => {
  const message: SetOption = {
    name: 'SetOption',
    option: {
      name,
      value,
    },
  };

  chrome.runtime.sendMessage(message);
};

export const getStylesForPage = async (
  important: boolean
): Promise<GetStylesForPageResponse> => {
  const message: GetStylesForPage = {
    name: 'GetStylesForPage',
    important,
  };

  return chrome.runtime.sendMessage(message);
};

export const openOptionsPage = (): void => {
  const message: OpenOptionsPage = {
    name: 'OpenOptionsPage',
  };

  chrome.runtime.sendMessage(message);
};

export const openDonatePage = (): void => {
  const message: OpenDonatePage = {
    name: 'OpenDonatePage',
  };

  chrome.runtime.sendMessage(message);
};

export const setStyle = (
  url: string,
  css: string,
  readability: boolean
): void => {
  const message: SetStyle = {
    name: 'SetStyle',
    url,
    css,
    readability,
  };

  chrome.runtime.sendMessage(message);
};

export const enableStyle = (url: string): void => {
  const message: EnableStyle = {
    name: 'EnableStyle',
    url,
  };

  chrome.runtime.sendMessage(message);
};

export const disableStyle = (url: string): void => {
  const message: DisableStyle = {
    name: 'DisableStyle',
    url,
  };

  chrome.runtime.sendMessage(message);
};

export const setReadability = (url: string, value: boolean): void => {
  const message: SetReadability = {
    name: 'SetReadability',
    value,
    url,
  };

  chrome.runtime.sendMessage(message);
};

export const getCommands = async (): Promise<GetCommandsResponse> => {
  const message: GetCommands = {
    name: 'GetCommands',
  };

  return chrome.runtime.sendMessage(message);
};

export const getReadabilitySettings =
  async (): Promise<GetReadabilitySettingsResponse> => {
    const message: GetReadabilitySettings = {
      name: 'GetReadabilitySettings',
    };

    return chrome.runtime.sendMessage(message);
  };

export const setReadabilitySettings = (value: ReadabilitySettings): void => {
  const message: SetReadabilitySettings = {
    name: 'SetReadabilitySettings',
    value,
  };

  chrome.runtime.sendMessage(message);
};

export const getEditorOnboardingDone =
  async (): Promise<GetEditorOnboardingDoneResponse> => {
    const message: GetEditorOnboardingDone = {
      name: 'GetEditorOnboardingDone',
    };

    return chrome.runtime.sendMessage(message);
  };

export const setEditorOnboardingDone = (value: boolean): Promise<void> => {
  const message: SetEditorOnboardingDone = {
    name: 'SetEditorOnboardingDone',
    value,
  };

  return chrome.runtime.sendMessage(message);
};

export const getGoogleFontsCache =
  async (): Promise<GetGoogleFontsCacheResponse> => {
    const message: GetGoogleFontsCache = {
      name: 'GetGoogleFontsCache',
    };

    return chrome.runtime.sendMessage(message);
  };

export const setGoogleFontsCache = (value: GoogleFontsCache): Promise<void> => {
  const message: SetGoogleFontsCache = {
    name: 'SetGoogleFontsCache',
    value,
  };

  return chrome.runtime.sendMessage(message);
};

export const reportDiagnostic = (
  category: DiagnosticCategory,
  operation: string,
  error: unknown,
  level: 'warning' | 'error' = 'error'
): Promise<void> => {
  const message: RecordDiagnostic = {
    name: 'RecordDiagnostic',
    category,
    operation,
    errorMessage:
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error),
    level,
  };

  return chrome.runtime.sendMessage(message);
};
