/* eslint-disable @typescript-eslint/no-explicit-any */
import CustomLight from './themes/CustomLight';
import CustomDark from './themes/CustomDark';
import CustomSepia from './themes/CustomSepia';
import {
  getMonacoThemeName,
  isMonacoTheme,
  MONACO_THEMES,
  MONACO_THEME_STORAGE_KEY,
  type MonacoTheme,
} from '../themes';
import {
  DEFAULT_MONACO_LINT_SETTINGS,
  getMonacoCssOptions,
  isMonacoLintPreset,
  MONACO_LINT_PRESETS,
  MONACO_LINT_STORAGE_KEY,
  normalizeLintSite,
  parseMonacoLintSettings,
  resolveMonacoLintPreset,
  type MonacoLintPreset,
  type MonacoLintSettings,
} from '../lint-presets';
import {
  getParentMessageOrigin,
  isExpectedParentWindowMessage,
  isParentUpdateCssMessage,
} from '../messages';
import type { IframeMessage } from '../messages';
import {
  formatStyleCode,
  MONACO_FORMAT_ON_SAVE_STORAGE_KEY,
  parseFormatOnSave,
  type MonacoStyleLanguage,
} from '../format-on-save';

declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

class MonacoEditorIframe {
  // todo: import monaco types
  editor?: any;
  currentLanguage = 'css';
  currentTheme: MonacoTheme = 'dark';
  lintSettings: MonacoLintSettings = {
    ...DEFAULT_MONACO_LINT_SETTINGS,
    sitePresets: {},
  };
  currentLintPreset: MonacoLintPreset = 'relaxed';
  lintSite?: string;
  lintSelect?: HTMLSelectElement;
  formatOnSave = false;
  formatting = false;

  constructor() {
    this.loadEditor(async () => {
      await Promise.all([
        this.loadTheme(),
        this.loadLintSettings(),
        this.loadFormatOnSave(),
      ]);
      this.attachWindowListeners();
      this.defineThemes();
      this.initEditor();
      this.addToolbar();
      this.postMessage({ type: 'stylebotMonacoIframeLoaded' });
    });
  }

  loadEditor(callback: () => void): void {
    window.require.config({
      paths: {
        vs: chrome.runtime.getURL(
          'monaco-editor/iframe/node_modules/monaco-editor/min/vs'
        ),
      },
    });

    window.require(['vs/editor/editor.main'], callback);
  }

  defineThemes(): void {
    window.monaco.editor.defineTheme('stylekit-light', CustomLight);
    window.monaco.editor.defineTheme('stylekit-dark', CustomDark);
    window.monaco.editor.defineTheme('stylekit-sepia', CustomSepia);
  }

  async loadTheme(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(MONACO_THEME_STORAGE_KEY);
      const theme = stored[MONACO_THEME_STORAGE_KEY];
      if (isMonacoTheme(theme)) this.currentTheme = theme;
    } catch {
      this.currentTheme = 'dark';
    }
  }

  async loadLintSettings(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(MONACO_LINT_STORAGE_KEY);
      this.lintSettings = parseMonacoLintSettings(
        stored[MONACO_LINT_STORAGE_KEY]
      );
    } catch {
      this.lintSettings = {
        ...DEFAULT_MONACO_LINT_SETTINGS,
        sitePresets: {},
      };
    }
    this.currentLintPreset = resolveMonacoLintPreset(this.lintSettings);
  }

  async loadFormatOnSave(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(
        MONACO_FORMAT_ON_SAVE_STORAGE_KEY
      );
      this.formatOnSave = parseFormatOnSave(
        stored[MONACO_FORMAT_ON_SAVE_STORAGE_KEY]
      );
    } catch {
      this.formatOnSave = false;
    }
  }

  initEditor(): void {
    const container = this.getContainer();
    const editorOptions = this.getEditorOptions();

    this.applyLintPreset();

    this.editor = window.monaco.editor.create(container, editorOptions);
    this.editor.onDidChangeModelContent(() => {
      this.postMessage({
        css: this.editor.getValue(),
        type: 'stylebotMonacoIframeCssUpdated',
      });
    });
    this.editor.addAction({
      id: 'stylekit.prettier-on-save',
      label: 'Format with Prettier',
      keybindings: [
        window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyS,
      ],
      run: () => this.formatEditorOnSave(),
    });
    this.editor.onDidBlurEditorText(() => {
      void this.formatEditorOnSave();
    });
  }

  getContainer(): HTMLDivElement {
    // DOM element is guaranteed to exist, so typecasting it.
    return document.getElementById('container') as HTMLDivElement;
  }

  getEditorOptions(): any {
    const container = this.getContainer();
    // todo: find a more robust / accurate way to compute;
    // might not work for some cases
    const wordWrapColumn = Math.round(container.offsetWidth / 8);

    return {
      value: '',
      tabSize: 2,
      theme: getMonacoThemeName(this.currentTheme),
      wordWrap: 'bounded',
      wordWrapColumn,
      scrollBeyondLastLine: false,
      language: 'css',
      folding: false,
      renderLineHighlight: 'none',
      suggestOnTriggerCharacters: false,
      cursorBlinking: 'smooth',
      mouseWheelZoom: false,
      lineNumbers: 'off',
      minimap: {
        enabled: false,
      },
      hover: {
        enabled: false,
      },
      codeLens: false,
    };
  }

  postMessage(message: IframeMessage): void {
    window.parent.postMessage(message, getParentMessageOrigin());
  }

  handleStylebotCssUpdate(css: string, selector?: string): void {
    this.editor.setValue(css);
    this.editor.focus();

    if (selector) {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = `^${escaped}\\s\\{\\n\\s*(?!\\}).*$`;
      const match = this.editor.getModel().findNextMatch(
        regex,
        {
          column: 1,
          lineNumber: 1,
        },
        true
      );

      if (match) {
        this.editor.setSelection({
          startColumn: match.range.endColumn,
          startLineNumber: match.range.endLineNumber,
          endColumn: match.range.endColumn,
          endLineNumber: match.range.endLineNumber,
        });
      }
    }
  }

  applyLintPreset(): void {
    const cssOptions = getMonacoCssOptions(this.currentLintPreset);
    this.getContainer().dataset.stylekitLintPreset = this.currentLintPreset;
    try {
      if (window.monaco.languages?.css?.cssDefaults?.setOptions) {
        window.monaco.languages.css.cssDefaults.setOptions(cssOptions);
      } else if (
        window.monaco.languages?.css?.cssDefaults?.setDiagnosticsOptions
      ) {
        window.monaco.languages.css.cssDefaults.setDiagnosticsOptions(
          cssOptions
        );
      }
    } catch {
      // Monaco versions without configurable CSS diagnostics keep defaults.
    }
  }

  setLintSite(site?: string): void {
    const normalized = normalizeLintSite(site);
    if (normalized === this.lintSite) return;
    this.lintSite = normalized;
    this.currentLintPreset = resolveMonacoLintPreset(
      this.lintSettings,
      this.lintSite
    );
    this.applyLintPreset();
    this.refreshLintControl();
  }

  async setLintSelection(value: string): Promise<void> {
    if (this.lintSite) {
      if (value === 'default') {
        delete this.lintSettings.sitePresets[this.lintSite];
      } else if (isMonacoLintPreset(value)) {
        this.lintSettings.sitePresets[this.lintSite] = value;
      } else {
        return;
      }
    } else if (isMonacoLintPreset(value)) {
      this.lintSettings.defaultPreset = value;
    } else {
      return;
    }
    this.currentLintPreset = resolveMonacoLintPreset(
      this.lintSettings,
      this.lintSite
    );
    this.applyLintPreset();
    this.refreshLintControl();
    await chrome.storage.local.set({
      [MONACO_LINT_STORAGE_KEY]: this.lintSettings,
    });
  }

  async formatEditorOnSave(): Promise<void> {
    if (!this.formatOnSave || this.formatting || !this.editor) return;

    const model = this.editor.getModel();
    if (!model) return;

    this.formatting = true;
    const container = this.getContainer();
    try {
      const current = model.getValue();
      const formatted = await formatStyleCode(
        current,
        this.currentLanguage as MonacoStyleLanguage
      );
      if (formatted !== current) {
        this.editor.pushUndoStop();
        this.editor.executeEdits('stylekit-prettier', [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ]);
        this.editor.pushUndoStop();
      }
      container.dataset.stylekitFormatStatus = 'ready';
    } catch {
      container.dataset.stylekitFormatStatus = 'error';
    } finally {
      this.formatting = false;
    }
  }

  addToolbar(): void {
    const container = this.getContainer();
    container.dataset.stylekitMonacoTheme = this.currentTheme;
    container.dataset.stylekitFormatOnSave = String(this.formatOnSave);
    const toolbar = document.createElement('div');
    Object.assign(toolbar.style, {
      position: 'absolute',
      top: '4px',
      right: '12px',
      zIndex: '10',
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    });

    const themeSelect = document.createElement('select');
    themeSelect.setAttribute('aria-label', 'Monaco theme');
    MONACO_THEMES.forEach(theme => {
      const option = document.createElement('option');
      option.value = theme.value;
      option.textContent = theme.label;
      themeSelect.appendChild(option);
    });
    themeSelect.value = this.currentTheme;
    Object.assign(themeSelect.style, {
      background: '#313244',
      border: '1px solid #45475a',
      borderRadius: '3px',
      color: '#a6adc8',
      fontSize: '10px',
      padding: '2px 4px',
      cursor: 'pointer',
      fontFamily: 'sans-serif',
    });
    themeSelect.addEventListener('change', () => {
      if (!isMonacoTheme(themeSelect.value)) return;
      this.currentTheme = themeSelect.value;
      window.monaco.editor.setTheme(getMonacoThemeName(this.currentTheme));
      container.dataset.stylekitMonacoTheme = this.currentTheme;
      void chrome.storage.local.set({
        [MONACO_THEME_STORAGE_KEY]: this.currentTheme,
      });
    });
    toolbar.appendChild(themeSelect);

    this.lintSelect = document.createElement('select');
    this.lintSelect.setAttribute('aria-label', 'CSS lint preset');
    Object.assign(this.lintSelect.style, {
      background: '#313244',
      border: '1px solid #45475a',
      borderRadius: '3px',
      color: '#a6adc8',
      fontSize: '10px',
      padding: '2px 4px',
      cursor: 'pointer',
      fontFamily: 'sans-serif',
      maxWidth: '112px',
    });
    this.lintSelect.addEventListener('change', () => {
      void this.setLintSelection(this.lintSelect?.value || 'default');
    });
    this.refreshLintControl();
    toolbar.appendChild(this.lintSelect);

    const formatLabel = document.createElement('label');
    formatLabel.title = 'Format with Prettier on Ctrl/Cmd+S or focus loss';
    Object.assign(formatLabel.style, {
      alignItems: 'center',
      color: '#a6adc8',
      cursor: 'pointer',
      display: 'flex',
      fontFamily: 'sans-serif',
      fontSize: '10px',
      gap: '2px',
      whiteSpace: 'nowrap',
    });
    const formatCheckbox = document.createElement('input');
    formatCheckbox.type = 'checkbox';
    formatCheckbox.checked = this.formatOnSave;
    formatCheckbox.setAttribute('aria-label', 'Prettier on save');
    formatCheckbox.addEventListener('change', () => {
      this.formatOnSave = formatCheckbox.checked;
      container.dataset.stylekitFormatOnSave = String(this.formatOnSave);
      void chrome.storage.local.set({
        [MONACO_FORMAT_ON_SAVE_STORAGE_KEY]: this.formatOnSave,
      });
    });
    formatLabel.append(formatCheckbox, 'Prettier');
    toolbar.appendChild(formatLabel);

    const btn = document.createElement('button');
    btn.textContent = 'CSS';
    btn.title = 'Toggle CSS/SCSS syntax';
    Object.assign(btn.style, {
      background: '#313244',
      border: '1px solid #45475a',
      borderRadius: '3px',
      color: '#6c7086',
      fontSize: '10px',
      fontWeight: '600',
      padding: '2px 6px',
      cursor: 'pointer',
      fontFamily: 'sans-serif',
      letterSpacing: '0.5px',
    });

    btn.addEventListener('click', () => {
      this.currentLanguage = this.currentLanguage === 'css' ? 'scss' : 'css';
      btn.textContent = this.currentLanguage.toUpperCase();
      btn.style.color = this.currentLanguage === 'scss' ? '#cba6f7' : '#6c7086';

      const model = this.editor.getModel();
      if (model) {
        window.monaco.editor.setModelLanguage(model, this.currentLanguage);
      }
    });

    container.style.position = 'relative';
    toolbar.appendChild(btn);
    container.appendChild(toolbar);
  }

  refreshLintControl(): void {
    if (!this.lintSelect) return;
    this.lintSelect.replaceChildren();
    if (this.lintSite) {
      const option = document.createElement('option');
      option.value = 'default';
      option.textContent = `Site: use ${this.lintSettings.defaultPreset}`;
      this.lintSelect.appendChild(option);
    }
    MONACO_LINT_PRESETS.forEach(preset => {
      const option = document.createElement('option');
      option.value = preset.value;
      option.textContent = preset.label;
      this.lintSelect?.appendChild(option);
    });
    this.lintSelect.value = this.lintSite
      ? this.lintSettings.sitePresets[this.lintSite] || 'default'
      : this.lintSettings.defaultPreset;
    this.lintSelect.title = this.lintSite
      ? `CSS diagnostics override for ${this.lintSite}`
      : 'Default CSS diagnostics preset';
  }

  attachWindowListeners(): void {
    window.addEventListener('resize', () => {
      this.editor.layout();
      this.editor.updateOptions(this.getEditorOptions());
    });

    window.addEventListener('message', (message: MessageEvent) => {
      if (
        isExpectedParentWindowMessage(message, window.parent) &&
        isParentUpdateCssMessage(message.data)
      ) {
        this.setLintSite(message.data.lintSite);
        this.handleStylebotCssUpdate(message.data.css, message.data.selector);
      }
    });
  }
}

export default MonacoEditorIframe;
