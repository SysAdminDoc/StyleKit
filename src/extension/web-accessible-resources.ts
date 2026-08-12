export type BundleChunk = {
  type: string;
  imports?: readonly string[];
};

export type BundleGraph = Record<string, BundleChunk>;

export type WebAccessibleResourceRule = {
  resources: string[];
  matches: string[];
  use_dynamic_url?: boolean;
};

export const DIRECT_WEB_ACCESSIBLE_RESOURCE_FILES = [
  'editor/index.css',
  'monaco-editor/iframe/index.html',
  'readability/index.css',
];

export const DISALLOWED_BROAD_WEB_ACCESSIBLE_RESOURCES = [
  '*',
  '**/*',
  'chunks/*',
  'monaco-editor/*',
  'monaco-editor/iframe/*',
  'monaco-editor/iframe/node_modules/*',
];

export const collectImportedWebAccessibleResources = (
  bundle: BundleGraph,
  entryFiles: readonly string[] = []
): string[] => {
  const resources = new Set<string>();
  const visited = new Set<string>();

  const visit = (fileName: string): void => {
    if (visited.has(fileName)) return;
    visited.add(fileName);

    const chunk = bundle[fileName];
    if (!chunk || chunk.type !== 'chunk') return;

    for (const imported of chunk.imports || []) {
      resources.add(imported);
      visit(imported);
    }
  };

  entryFiles.forEach(visit);

  return Array.from(resources).sort();
};

export const createWebAccessibleResourceRules = (
  importedResources: readonly string[],
  useDynamicUrl: boolean
): WebAccessibleResourceRule[] => {
  const resources = Array.from(
    new Set([...DIRECT_WEB_ACCESSIBLE_RESOURCE_FILES, ...importedResources])
  ).sort();

  const rule: WebAccessibleResourceRule = {
    resources,
    matches: ['<all_urls>'],
  };

  if (useDynamicUrl) {
    rule.use_dynamic_url = true;
  }

  return [rule];
};
