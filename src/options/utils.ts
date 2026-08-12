import {
  GetAllStyles,
  SetAllStyles,
  SetOption,
  GetAllOptions,
  GetAllStylesResponse,
  StylebotOptions,
  GetCommands,
  SetCommands,
  GetCommandsResponse,
  StylebotCommands,
  StyleMap,
  RunGoogleDriveSync,
  StylesRollbackReason,
  StylesRollbackSnapshot,
  GetLastStylesRollbackSnapshot,
  RestoreLastStylesRollbackSnapshot,
  GoogleDriveSyncReport,
  DiagnosticCategory,
  DiagnosticsBundle,
  GetDiagnosticsBundle,
  RecordDiagnostic,
  SetStyleShadowRoots,
} from '@stylekit/types';
import {
  createImportPreview,
  createStyleImportEnvelope,
  parseStyleImportPayload,
  StyleImportPreview,
} from '../utils/style-import';

export {
  createImportPreview,
  createStyleImportEnvelope,
  getImportDiffText,
  isSafeCssContentType,
  isValidStyleMap,
  parseStyleImportPayload,
} from '../utils/style-import';

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

export const setAllStyles = (
  styles: StyleMap,
  rollbackReason?: StylesRollbackReason
): Promise<void> => {
  const message: SetAllStyles = {
    name: 'SetAllStyles',
    styles,
    rollbackReason,
  };

  return chrome.runtime.sendMessage(message);
};

export const setStyleShadowRoots = (
  url: string,
  enabled: boolean
): Promise<void> => {
  const message: SetStyleShadowRoots = {
    name: 'SetStyleShadowRoots',
    url,
    enabled,
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

export const runGoogleDriveSync = async (): Promise<GoogleDriveSyncReport> => {
  const message: RunGoogleDriveSync = {
    name: 'RunGoogleDriveSync',
  };

  return chrome.runtime.sendMessage(message);
};

export const getLastStylesRollbackSnapshot =
  async (): Promise<StylesRollbackSnapshot | null> => {
    const message: GetLastStylesRollbackSnapshot = {
      name: 'GetLastStylesRollbackSnapshot',
    };

    return chrome.runtime.sendMessage(message);
  };

export const restoreLastStylesRollbackSnapshot =
  async (): Promise<StylesRollbackSnapshot | null> => {
    const message: RestoreLastStylesRollbackSnapshot = {
      name: 'RestoreLastStylesRollbackSnapshot',
    };

    return chrome.runtime.sendMessage(message);
  };

const getDiagnosticErrorMessage = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

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
    errorMessage: getDiagnosticErrorMessage(error),
    level,
  };

  return chrome.runtime.sendMessage(message);
};

export const getDiagnosticsBundle = async (): Promise<DiagnosticsBundle> => {
  const message: GetDiagnosticsBundle = {
    name: 'GetDiagnosticsBundle',
  };

  return chrome.runtime.sendMessage(message);
};

export const exportDiagnosticsAsJSONFile = async (): Promise<void> => {
  const bundle = await getDiagnosticsBundle();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: 'application/json',
  });
  const objectUrl = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.href = objectUrl;
  downloadAnchor.download = `stylekit-diagnostics-${bundle.generatedAt.slice(0, 10)}.json`;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

export const importStylesWithFilePicker = (
  currentStyles: StyleMap
): Promise<StyleImportPreview> => {
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
            const parsed = parseStyleImportPayload(
              JSON.parse(reader.result as string)
            );

            resolve(
              createImportPreview(currentStyles, parsed.styles, 'replace')
            );
          } catch (e) {
            reject(
              e instanceof Error
                ? e.message
                : 'Failed to parse JSON file. Ensure the file is valid JSON.'
            );
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
  const exportData = createStyleImportEnvelope(styles);
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
