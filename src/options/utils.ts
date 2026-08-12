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
  PreviewStyleSource,
  SetStyleSource,
  ReloadStyleSource,
  RollbackStyleSource,
  GetStyleSourceStatuses,
  StyleSourceConfig,
  StyleSourceStatus,
  StyleSourceStatusMap,
  CollaborativePackSummary,
  CollaborativePackUpdateEnvelope,
  GetCollaborativePacks,
  CreateCollaborativePack,
  CaptureCollaborativePack,
  ExportCollaborativePack,
  ImportCollaborativePack,
  ApplyCollaborativePack,
  DeleteCollaborativePack,
  GetCollaborativePacksResponse,
  ExportCollaborativePackResponse,
} from '@stylekit/types';
import postcss from 'postcss';
import normalizeWhitespace from 'postcss-normalize-whitespace';
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

export const previewStyleSource = async (
  sourceUrl: string
): Promise<string> => {
  const message: PreviewStyleSource = {
    name: 'PreviewStyleSource',
    sourceUrl,
  };
  const response = await chrome.runtime.sendMessage(message);
  if (response.error || response.css === undefined) {
    throw new Error(response.error || 'The source did not return CSS.');
  }
  return response.css;
};

export const setStyleSource = async (
  url: string,
  source: StyleSourceConfig | null
): Promise<void> => {
  const message: SetStyleSource = {
    name: 'SetStyleSource',
    url,
    source,
  };
  const response = await chrome.runtime.sendMessage(message);
  if (response.error) throw new Error(response.error);
};

export const reloadStyleSource = async (
  url: string
): Promise<StyleSourceStatus> => {
  const message: ReloadStyleSource = {
    name: 'ReloadStyleSource',
    url,
  };
  return chrome.runtime.sendMessage(message);
};

export const rollbackStyleSource = async (
  url: string
): Promise<StyleSourceStatus> => {
  const message: RollbackStyleSource = {
    name: 'RollbackStyleSource',
    url,
  };
  return chrome.runtime.sendMessage(message);
};

export const getStyleSourceStatuses =
  async (): Promise<StyleSourceStatusMap> => {
    const message: GetStyleSourceStatuses = {
      name: 'GetStyleSourceStatuses',
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

const unwrapCollaborativePacks = (
  response: GetCollaborativePacksResponse
): CollaborativePackSummary[] => {
  if (response.error) throw new Error(response.error);
  return response.packs;
};

export const getCollaborativePacks = async (): Promise<
  CollaborativePackSummary[]
> => {
  const message: GetCollaborativePacks = { name: 'GetCollaborativePacks' };
  return unwrapCollaborativePacks(await chrome.runtime.sendMessage(message));
};

export const createCollaborativePack = async (
  packName: string
): Promise<CollaborativePackSummary[]> => {
  const message: CreateCollaborativePack = {
    name: 'CreateCollaborativePack',
    packName,
  };
  return unwrapCollaborativePacks(await chrome.runtime.sendMessage(message));
};

export const captureCollaborativePack = async (
  id: string
): Promise<CollaborativePackSummary[]> => {
  const message: CaptureCollaborativePack = {
    name: 'CaptureCollaborativePack',
    id,
  };
  return unwrapCollaborativePacks(await chrome.runtime.sendMessage(message));
};

export const exportCollaborativePack = async (
  id: string
): Promise<CollaborativePackUpdateEnvelope> => {
  const message: ExportCollaborativePack = {
    name: 'ExportCollaborativePack',
    id,
  };
  const response = (await chrome.runtime.sendMessage(
    message
  )) as ExportCollaborativePackResponse;
  if (response.error || !response.envelope) {
    throw new Error(response.error || 'Collaborative pack export failed');
  }
  return response.envelope;
};

export const importCollaborativePack = async (
  envelope: CollaborativePackUpdateEnvelope
): Promise<CollaborativePackSummary[]> => {
  const message: ImportCollaborativePack = {
    name: 'ImportCollaborativePack',
    envelope,
  };
  return unwrapCollaborativePacks(await chrome.runtime.sendMessage(message));
};

export const applyCollaborativePack = async (
  id: string
): Promise<CollaborativePackSummary[]> => {
  const message: ApplyCollaborativePack = {
    name: 'ApplyCollaborativePack',
    id,
  };
  return unwrapCollaborativePacks(await chrome.runtime.sendMessage(message));
};

export const deleteCollaborativePack = async (
  id: string
): Promise<CollaborativePackSummary[]> => {
  const message: DeleteCollaborativePack = {
    name: 'DeleteCollaborativePack',
    id,
  };
  return unwrapCollaborativePacks(await chrome.runtime.sendMessage(message));
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

export const createCssExport = async (
  styles: StyleMap,
  minify = false
): Promise<string> => {
  const parts: string[] = [];
  const processor = minify ? postcss([normalizeWhitespace()]) : null;

  for (const [url, style] of Object.entries(styles)) {
    if (style.css && style.css.trim()) {
      const css = processor
        ? (await processor.process(style.css, { from: undefined })).css
        : style.css;
      parts.push(`/* ${url} */\n${css}`);
    }
  }

  return parts.join(minify ? '\n' : '\n\n');
};

export const exportAsCSSFile = async (
  styles: StyleMap,
  minify = false
): Promise<void> => {
  const css = await createCssExport(styles, minify);
  const dataStr = 'data:text/css;charset=utf-8,' + encodeURIComponent(css);
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'stylekit_export.css');
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};
