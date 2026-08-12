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
  getExtensionMessageOrigin,
  isExpectedExtensionWindowMessage,
  isParentUpdateCssMessage,
} from '../messages';
import type { IframeMessage } from '../messages';

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

  constructor() {
    this.loadEditor(async () => {
      await this.loadTheme();
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

  initEditor(): void {
    const container = this.getContainer();
    const editorOptions = this.getEditorOptions();

    // Enable CSS validation with relaxed settings to allow modern CSS features
    // while still catching syntax errors (missing braces, invalid values, etc.)
    try {
      const cssOptions = {
        validate: true,
        lint: {
          compatibleVendorPrefixes: 'ignore' as const,
          vendorPrefix: 'ignore' as const,
          duplicateProperties: 'warning' as const,
          emptyRules: 'warning' as const,
          importStatement: 'ignore' as const,
          boxModel: 'ignore' as const,
          universalSelector: 'ignore' as const,
          zeroUnits: 'ignore' as const,
          fontFaceProperties: 'ignore' as const,
          hexColorLength: 'ignore' as const,
          argumentsInColorFunction: 'ignore' as const,
          unknownProperties: 'ignore' as const,
          validProperties: [],
          ieHack: 'ignore' as const,
          unknownVendorSpecificProperties: 'ignore' as const,
          propertyIgnoredDueToDisplay: 'ignore' as const,
          idSelector: 'ignore' as const,
          unknownAtRules: 'ignore' as const,
          float: 'ignore' as const,
        },
      };

      if (window.monaco.languages?.css?.cssDefaults?.setOptions) {
        window.monaco.languages.css.cssDefaults.setOptions(cssOptions);
      } else if (
        window.monaco.languages?.css?.cssDefaults?.setDiagnosticsOptions
      ) {
        window.monaco.languages.css.cssDefaults.setDiagnosticsOptions(
          cssOptions
        );
      }
    } catch (e) {
      // Monaco version may not support CSS validation options
    }

    this.editor = window.monaco.editor.create(container, editorOptions);
    this.editor.onDidChangeModelContent(() => {
      this.postMessage({
        css: this.editor.getValue(),
        type: 'stylebotMonacoIframeCssUpdated',
      });
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
    window.parent.postMessage(message, getExtensionMessageOrigin());
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

  addToolbar(): void {
    const container = this.getContainer();
    container.dataset.stylekitMonacoTheme = this.currentTheme;
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

  attachWindowListeners(): void {
    window.addEventListener('resize', () => {
      this.editor.layout();
      this.editor.updateOptions(this.getEditorOptions());
    });

    window.addEventListener('message', (message: MessageEvent) => {
      if (
        isExpectedExtensionWindowMessage(message, window.parent) &&
        isParentUpdateCssMessage(message.data)
      ) {
        this.handleStylebotCssUpdate(message.data.css, message.data.selector);
      }
    });
  }
}

export default MonacoEditorIframe;
