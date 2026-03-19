/* eslint-disable @typescript-eslint/no-explicit-any */
import CustomLight from './themes/CustomLight';
import CustomDark from './themes/CustomDark';
import { IframeMessage, ParentUpdateCssMessage } from '@stylekit/monaco-editor';

declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

class MonacoEditorIframe {
  // todo: import monaco types
  editor?: any;

  constructor() {
    this.loadEditor(() => {
      this.attachWindowListeners();
      this.defineThemes();
      this.initEditor();
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
    window.monaco.editor.defineTheme('custom-light', CustomLight);
    window.monaco.editor.defineTheme('custom-dark', CustomDark);
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
      } else if (window.monaco.languages?.css?.cssDefaults?.setDiagnosticsOptions) {
        window.monaco.languages.css.cssDefaults.setDiagnosticsOptions(cssOptions);
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
      theme: 'custom-dark',
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
    window.parent.postMessage(message, chrome.runtime.getURL('/'));
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

  attachWindowListeners(): void {
    window.addEventListener('resize', () => {
      this.editor.layout();
      this.editor.updateOptions(this.getEditorOptions());
    });

    window.addEventListener(
      'message',
      (message: { data: ParentUpdateCssMessage }) => {
        if (message.data.type === 'stylebotCssUpdate') {
          this.handleStylebotCssUpdate(message.data.css, message.data.selector);
        }
      }
    );
  }
}

export default MonacoEditorIframe;
