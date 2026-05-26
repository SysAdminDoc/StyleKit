import {
  GetAllStyles,
  SetAllStyles,
  SetOption,
  GetAllOptions,
  GetAllStylesResponse,
  GetAllOptionsResponse,
  StylebotOptions,
  GetCommands,
  SetCommands,
  GetCommandsResponse,
  StylebotCommands,
  StyleMap,
  RunGoogleDriveSync,
} from '@stylekit/types';

export const getAllStyles = async (): Promise<GetAllStylesResponse> => {
  const message: GetAllStyles = {
    name: 'GetAllStyles',
  };

  return chrome.runtime.sendMessage(message);
};

export const getAllOptions = async (): Promise<StylebotOptions> => {
  const message: GetAllOptions = {
    name: 'GetAllOptions',
  };

  return chrome.runtime.sendMessage(message);
};

export const setAllStyles = (styles: StyleMap): void => {
  const message: SetAllStyles = {
    name: 'SetAllStyles',
    styles,
  };

  chrome.runtime.sendMessage(message);
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

export const getCommands = async (): Promise<GetCommandsResponse> => {
  const message: GetCommands = {
    name: 'GetCommands',
  };

  return chrome.runtime.sendMessage(message);
};

export const setCommands = (commands: StylebotCommands): void => {
  const message: SetCommands = {
    name: 'SetCommands',
    value: commands,
  };

  chrome.runtime.sendMessage(message);
};

export const runGoogleDriveSync = async (): Promise<void> => {
  const message: RunGoogleDriveSync = {
    name: 'RunGoogleDriveSync',
  };

  return chrome.runtime.sendMessage(message);
};

const isValidStyleMap = (data: unknown): data is StyleMap => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (typeof key !== 'string') return false;
    if (!value || typeof value !== 'object') return false;
    const style = value as Record<string, unknown>;
    if (typeof style.css !== 'string' && style.css !== undefined) return false;
    if (typeof style.enabled !== 'boolean' && style.enabled !== undefined) return false;
  }
  return true;
};

export const importStylesWithFilePicker = (): Promise<StyleMap> => {
  return new Promise((resolve, reject) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';

    fileInput.addEventListener('change', (event: Event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files && files[0]) {
        const file = files[0];
        if (file.type && file.type !== 'application/json') {
          reject('Only JSON format is supported.');
          return;
        }

        const reader = new FileReader();
        reader.readAsText(file);

        reader.onload = () => {
          try {
            const parsed = JSON.parse(reader.result as string);

            // Support versioned export format: { version, styles }
            const styles = parsed?.version && parsed?.styles ? parsed.styles : parsed;

            if (!isValidStyleMap(styles)) {
              reject('Invalid format. Expected a StyleKit JSON backup (object with URL keys and {css, enabled} values).');
              return;
            }

            resolve(styles);
          } catch (e) {
            reject('Failed to parse JSON file. Ensure the file is valid JSON.');
          }
        };

        reader.onerror = () => {
          reject(reader.error);
        };
      }
    });

    document.body.appendChild(fileInput);
    fileInput.click();
    fileInput.remove();
  });
};

export const exportAsJSONFile = (styles: StyleMap): void => {
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'StyleKit',
    styles,
  };
  const json = JSON.stringify(exportData, null, 2);
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(json);
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'stylekit_backup.json');
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

export const exportAsCSSFile = (styles: StyleMap): void => {
  const parts: string[] = [];

  Object.entries(styles).forEach(([url, style]) => {
    if (style.css && style.css.trim()) {
      parts.push(`/* ${url} */\n${style.css}`);
    }
  });

  const css = parts.join('\n\n');
  const dataStr = 'data:text/css;charset=utf-8,' + encodeURIComponent(css);
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'stylekit_export.css');
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};
