import type {
  DiagnosticCategory,
  DiagnosticEvent,
  DiagnosticsBundle,
} from '@stylekit/types';

const DIAGNOSTICS_KEY = 'stylekit-diagnostic-events';
const MAX_EVENTS = 100;
const MAX_RAW_MESSAGE_LENGTH = 1000;
const MAX_MESSAGE_LENGTH = 240;

type DiagnosticInput = {
  category: DiagnosticCategory;
  operation: string;
  error: unknown;
  level?: DiagnosticEvent['level'];
};

let writeQueue: Promise<void> = Promise.resolve();
let eventSequence = 0;

const normalizeOperation = (operation: string): string =>
  String(operation || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'unknown';

export const sanitizeDiagnosticMessage = (error: unknown): string => {
  const raw = (
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error || 'Unknown error')
  ).slice(0, MAX_RAW_MESSAGE_LENGTH);

  return raw
    .replace(/data:[^\s]+/gi, '[data-url]')
    .replace(/https?:\/\/[^\s)\]}]+/gi, '[url]')
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(
      /\b(token|secret|password|api[-_ ]?key|authorization)\s*[:=]\s*[^\s,;]+/gi,
      '$1=[redacted]'
    )
    .replace(/[A-Za-z0-9+/_=-]{32,}/g, '[redacted]')
    .replace(/\{[\s\S]*?\}/g, '[content redacted]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
};

const normalizeStoredEvents = (value: unknown): DiagnosticEvent[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((event): event is DiagnosticEvent => {
      const candidate = event as Partial<DiagnosticEvent> | null;
      return Boolean(
        candidate &&
        typeof candidate.id === 'string' &&
        typeof candidate.timestamp === 'string' &&
        typeof candidate.category === 'string' &&
        typeof candidate.operation === 'string' &&
        typeof candidate.message === 'string' &&
        (candidate.level === 'warning' || candidate.level === 'error')
      );
    })
    .slice(-MAX_EVENTS);
};

const readEvents = async (): Promise<DiagnosticEvent[]> => {
  const stored = await chrome.storage.local.get(DIAGNOSTICS_KEY);
  return normalizeStoredEvents(stored[DIAGNOSTICS_KEY]);
};

export const recordDiagnostic = (input: DiagnosticInput): Promise<void> => {
  const write = writeQueue.then(async () => {
    const timestamp = Date.now();
    const events = await readEvents();
    eventSequence = (eventSequence + 1) % 1000000;
    events.push({
      id: `${timestamp}-${eventSequence}`,
      timestamp: new Date(timestamp).toISOString(),
      category: input.category,
      operation: normalizeOperation(input.operation),
      level: input.level || 'error',
      message: sanitizeDiagnosticMessage(input.error),
    });
    await chrome.storage.local.set({
      [DIAGNOSTICS_KEY]: events.slice(-MAX_EVENTS),
    });
  });

  writeQueue = write.catch(() => undefined);
  return write;
};

const detectBrowserName = (userAgent: string): string => {
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/Edg\//i.test(userAgent)) return 'Microsoft Edge';
  if (/OPR\//i.test(userAgent)) return 'Opera';
  if (/Chrome\//i.test(userAgent)) return 'Chrome/Chromium';
  return 'Unknown';
};

export const getDiagnosticsBundle = async (): Promise<DiagnosticsBundle> => {
  const [events, permissionInfo, localBytes, platform] = await Promise.all([
    readEvents(),
    chrome.permissions.getAll().catch(() => ({ permissions: [], origins: [] })),
    chrome.storage.local.getBytesInUse(null).catch(() => null),
    chrome.runtime.getPlatformInfo().catch(() => undefined),
  ]);
  const userAgent = globalThis.navigator?.userAgent || 'Unavailable';
  const manifest = chrome.runtime.getManifest();

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    extension: {
      name: 'StyleKit',
      version: manifest.version,
    },
    browser: {
      name: detectBrowserName(userAgent),
      userAgent,
      platform: platform
        ? {
            os: platform.os,
            arch: platform.arch,
            naclArch: platform.nacl_arch,
          }
        : undefined,
    },
    permissions: {
      api: [...(permissionInfo.permissions || [])].sort(),
      origins: [...(permissionInfo.origins || [])].sort(),
    },
    storage: {
      localBytes,
    },
    events,
  };
};

export const DIAGNOSTICS_STORAGE_KEY = DIAGNOSTICS_KEY;
