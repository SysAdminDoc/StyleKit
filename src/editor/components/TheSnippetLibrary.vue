<template>
  <div class="snippet-library">
    <div v-if="!activeSelector" class="snippet-empty">
      Select an element to apply snippets
    </div>

    <template v-else>
      <div class="snippet-tabs">
        <span
          class="snippet-tab"
          :class="{ active: activeTab === 'utilities' }"
          @click="activeTab = 'utilities'"
        >
          Utilities
        </span>
        <span
          class="snippet-tab"
          :class="{ active: activeTab === 'flair' }"
          @click="activeTab = 'flair'"
        >
          Flair
        </span>
      </div>

      <div
        v-for="(category, catIndex) in visibleCategories"
        :key="catIndex"
        class="snippet-category"
      >
        <div class="snippet-category-label">{{ category.label }}</div>
        <div
          v-for="(snippet, index) in category.snippets"
          :key="index"
          class="snippet-item"
          :class="{ installed: isInstalled(snippet), previewing: previewingKey === snippetKey(catIndex, index) }"
        >
          <span class="snippet-name">{{ snippet.name }}</span>
          <span class="snippet-actions">
            <span
              class="snippet-btn snippet-preview-btn"
              :class="{ active: previewingKey === snippetKey(catIndex, index) }"
              @mouseenter="startPreview(snippet, catIndex, index)"
              @mouseleave="stopPreview"
            >
              Preview
            </span>
            <span
              v-if="isInstalled(snippet)"
              class="snippet-btn snippet-remove-btn"
              @click="removeSnippet(snippet)"
            >
              Remove
            </span>
            <span
              v-else
              class="snippet-btn snippet-install-btn"
              @click="installSnippet(snippet)"
            >
              Install
            </span>
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Declaration } from 'postcss';

type Snippet = {
  name: string;
  css: string;
  keyframes?: string;
};

type SnippetCategory = {
  label: string;
  tab: 'utilities' | 'flair';
  snippets: Snippet[];
};

const SNIPPET_CATEGORIES: SnippetCategory[] = [
  {
    label: 'Visibility',
    tab: 'utilities',
    snippets: [
      { name: 'Hide element', css: 'display: none !important;' },
      { name: 'Make transparent', css: 'opacity: 0 !important;' },
      { name: 'Collapse space', css: 'visibility: hidden !important; height: 0 !important; overflow: hidden !important;' },
      { name: 'Remove fixed position', css: 'position: relative !important;' },
    ],
  },
  {
    label: 'Layout',
    tab: 'utilities',
    snippets: [
      { name: 'Full width', css: 'width: 100% !important; max-width: none !important;' },
      { name: 'Center element', css: 'margin-left: auto !important; margin-right: auto !important;' },
      { name: 'Remove margins', css: 'margin: 0 !important;' },
      { name: 'Remove padding', css: 'padding: 0 !important;' },
      { name: 'Force wrap text', css: 'white-space: normal !important; word-break: break-word !important;' },
    ],
  },
  {
    label: 'Typography',
    tab: 'utilities',
    snippets: [
      { name: 'Increase font size', css: 'font-size: 18px !important;' },
      { name: 'System font stack', css: "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;" },
      { name: 'Monospace font', css: "font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace !important;" },
      { name: 'Better line height', css: 'line-height: 1.6 !important;' },
    ],
  },
  {
    label: 'Cleanup',
    tab: 'utilities',
    snippets: [
      { name: 'Hide sticky headers', css: 'position: relative !important; top: auto !important;' },
      { name: 'Remove animations', css: 'animation: none !important; transition: none !important;' },
      { name: 'Remove box shadows', css: 'box-shadow: none !important;' },
      { name: 'Remove borders', css: 'border: none !important;' },
      { name: 'Remove rounded corners', css: 'border-radius: 0 !important;' },
      { name: 'Force scrollbar', css: 'overflow: auto !important;' },
    ],
  },
  {
    label: 'Dark Mode',
    tab: 'utilities',
    snippets: [
      { name: 'Invert colors', css: 'filter: invert(1) hue-rotate(180deg) !important;' },
      { name: 'Dark background', css: 'background-color: #1e1e2e !important; color: #cdd6f4 !important;' },
      { name: 'Reduce brightness', css: 'filter: brightness(0.8) !important;' },
      { name: 'Desaturate', css: 'filter: saturate(0.5) !important;' },
    ],
  },
  {
    label: 'Glassmorphism',
    tab: 'flair',
    snippets: [
      { name: 'Frosted glass', css: 'background: rgba(255, 255, 255, 0.1) !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; border: 1px solid rgba(255, 255, 255, 0.15) !important;' },
      { name: 'Dark glass', css: 'background: rgba(0, 0, 0, 0.4) !important; backdrop-filter: blur(16px) saturate(180%) !important; -webkit-backdrop-filter: blur(16px) saturate(180%) !important; border: 1px solid rgba(255, 255, 255, 0.08) !important;' },
      { name: 'Acrylic panel', css: 'background: rgba(30, 30, 46, 0.75) !important; backdrop-filter: blur(20px) !important; -webkit-backdrop-filter: blur(20px) !important; border: 1px solid rgba(205, 214, 244, 0.1) !important; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;' },
      { name: 'Subtle blur', css: 'backdrop-filter: blur(6px) !important; -webkit-backdrop-filter: blur(6px) !important;' },
    ],
  },
  {
    label: 'Glow & Neon',
    tab: 'flair',
    snippets: [
      { name: 'Blue glow', css: 'box-shadow: 0 0 10px rgba(137, 180, 250, 0.5), 0 0 30px rgba(137, 180, 250, 0.2) !important;' },
      { name: 'Purple glow', css: 'box-shadow: 0 0 10px rgba(203, 166, 247, 0.5), 0 0 30px rgba(203, 166, 247, 0.2) !important;' },
      { name: 'Neon border', css: 'border: 1px solid #89b4fa !important; box-shadow: 0 0 5px #89b4fa, inset 0 0 5px rgba(137, 180, 250, 0.1) !important;' },
      { name: 'Neon text', css: 'color: #cba6f7 !important; text-shadow: 0 0 7px rgba(203, 166, 247, 0.6), 0 0 20px rgba(203, 166, 247, 0.3) !important;' },
      { name: 'Warm glow', css: 'box-shadow: 0 0 15px rgba(250, 179, 135, 0.4), 0 0 40px rgba(250, 179, 135, 0.15) !important;' },
    ],
  },
  {
    label: 'Gradients',
    tab: 'flair',
    snippets: [
      { name: 'Sunset', css: 'background: linear-gradient(135deg, #f38ba8, #fab387, #f9e2af) !important;' },
      { name: 'Ocean', css: 'background: linear-gradient(135deg, #89b4fa, #74c7ec, #94e2d5) !important;' },
      { name: 'Aurora', css: 'background: linear-gradient(135deg, #cba6f7, #89b4fa, #a6e3a1) !important;' },
      { name: 'Midnight', css: 'background: linear-gradient(135deg, #1e1e2e, #313244, #45475a) !important;' },
      { name: 'Gradient text', css: 'background: linear-gradient(135deg, #89b4fa, #cba6f7) !important; -webkit-background-clip: text !important; -webkit-text-fill-color: transparent !important; background-clip: text !important;' },
      { name: 'Gradient border', css: 'border: 2px solid transparent !important; background-clip: padding-box !important; background-image: linear-gradient(#1e1e2e, #1e1e2e), linear-gradient(135deg, #89b4fa, #cba6f7) !important; background-origin: border-box !important;' },
    ],
  },
  {
    label: 'Shapes & Cards',
    tab: 'flair',
    snippets: [
      { name: 'Pill shape', css: 'border-radius: 9999px !important;' },
      { name: 'Rounded card', css: 'border-radius: 12px !important; overflow: hidden !important;' },
      { name: 'Floating card', css: 'border-radius: 12px !important; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.2) !important;' },
      { name: 'Elevated card', css: 'border-radius: 16px !important; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;' },
      { name: 'Inset panel', css: 'box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3) !important; border-radius: 8px !important;' },
      { name: 'Circle', css: 'border-radius: 50% !important; aspect-ratio: 1 !important;' },
    ],
  },
  {
    label: 'Animations',
    tab: 'flair',
    snippets: [
      { name: 'Smooth hover lift', css: 'transition: transform 0.2s ease, box-shadow 0.2s ease !important;' },
      { name: 'Fade in', css: 'animation: stylebot-fade-in 0.5s ease both !important;', keyframes: '@keyframes stylebot-fade-in { from { opacity: 0; } to { opacity: 1; } }' },
      { name: 'Slide up', css: 'animation: stylebot-slide-up 0.4s ease both !important;', keyframes: '@keyframes stylebot-slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }' },
      { name: 'Pulse', css: 'animation: stylebot-pulse 2s ease-in-out infinite !important;', keyframes: '@keyframes stylebot-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }' },
      { name: 'Smooth scale', css: 'transition: transform 0.15s ease !important;' },
      { name: 'Bounce in', css: 'animation: stylebot-bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) both !important;', keyframes: '@keyframes stylebot-bounce-in { from { opacity: 0; transform: scale(0.3); } to { opacity: 1; transform: scale(1); } }' },
      { name: 'Shake', css: 'animation: stylebot-shake 0.5s ease both !important;', keyframes: '@keyframes stylebot-shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-5px); } 40%, 80% { transform: translateX(5px); } }' },
      { name: 'Float', css: 'animation: stylebot-float 3s ease-in-out infinite !important;', keyframes: '@keyframes stylebot-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }' },
    ],
  },
  {
    label: 'Borders & Outlines',
    tab: 'flair',
    snippets: [
      { name: 'Dashed accent', css: 'border: 2px dashed #89b4fa !important;' },
      { name: 'Double border', css: 'border: 4px double #cba6f7 !important;' },
      { name: 'Ridge border', css: 'border: 3px ridge #f38ba8 !important;' },
      { name: 'Dotted rainbow', css: 'border-top: 3px dotted #f38ba8 !important; border-right: 3px dotted #fab387 !important; border-bottom: 3px dotted #a6e3a1 !important; border-left: 3px dotted #89b4fa !important;' },
      { name: 'Focus ring', css: 'outline: 2px solid #89b4fa !important; outline-offset: 3px !important;' },
      { name: 'Left accent bar', css: 'border-left: 4px solid #89b4fa !important; padding-left: 12px !important;' },
      { name: 'Bottom highlight', css: 'border-bottom: 3px solid #a6e3a1 !important;' },
    ],
  },
  {
    label: 'Shadows & Depth',
    tab: 'flair',
    snippets: [
      { name: 'Soft shadow', css: 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;' },
      { name: 'Hard shadow', css: 'box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.3) !important;' },
      { name: 'Retro shadow', css: 'box-shadow: 4px 4px 0 #89b4fa !important;' },
      { name: 'Layered shadow', css: 'box-shadow: 0 1px 1px rgba(0,0,0,0.08), 0 2px 2px rgba(0,0,0,0.08), 0 4px 4px rgba(0,0,0,0.08), 0 8px 8px rgba(0,0,0,0.08), 0 16px 16px rgba(0,0,0,0.08) !important;' },
      { name: 'Inner glow', css: 'box-shadow: inset 0 0 20px rgba(137, 180, 250, 0.2) !important;' },
      { name: 'Neumorphism light', css: 'background: #e0e5ec !important; box-shadow: 8px 8px 16px #b8bec7, -8px -8px 16px #ffffff !important; border-radius: 12px !important;' },
      { name: 'Neumorphism dark', css: 'background: #1e1e2e !important; box-shadow: 8px 8px 16px #16161f, -8px -8px 16px #26263d !important; border-radius: 12px !important;' },
    ],
  },
  {
    label: 'Transforms',
    tab: 'flair',
    snippets: [
      { name: 'Rotate 3D', css: 'transform: perspective(600px) rotateY(5deg) !important;' },
      { name: 'Tilt left', css: 'transform: rotate(-2deg) !important;' },
      { name: 'Tilt right', css: 'transform: rotate(2deg) !important;' },
      { name: 'Skew', css: 'transform: skewX(-3deg) !important;' },
      { name: 'Scale up', css: 'transform: scale(1.05) !important;' },
      { name: 'Flip horizontal', css: 'transform: scaleX(-1) !important;' },
    ],
  },
  {
    label: 'Filters & Effects',
    tab: 'flair',
    snippets: [
      { name: 'Blur', css: 'filter: blur(2px) !important;' },
      { name: 'Grayscale', css: 'filter: grayscale(1) !important;' },
      { name: 'Sepia tone', css: 'filter: sepia(0.6) !important;' },
      { name: 'High contrast', css: 'filter: contrast(1.3) !important;' },
      { name: 'Vintage', css: 'filter: sepia(0.3) contrast(1.1) brightness(1.1) saturate(0.8) !important;' },
      { name: 'Cool tone', css: 'filter: hue-rotate(15deg) saturate(1.2) !important;' },
      { name: 'Warm tone', css: 'filter: hue-rotate(-10deg) saturate(1.3) brightness(1.05) !important;' },
      { name: 'Duotone', css: 'filter: grayscale(1) brightness(0.9) contrast(1.2) !important; mix-blend-mode: multiply !important;' },
    ],
  },
  {
    label: 'Text Effects',
    tab: 'flair',
    snippets: [
      { name: 'Text shadow', css: 'text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3) !important;' },
      { name: 'Embossed text', css: 'text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4), 0 -1px 0 rgba(0, 0, 0, 0.3) !important;' },
      { name: 'Engraved text', css: 'text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255, 255, 255, 0.15) !important;' },
      { name: 'Long shadow text', css: 'text-shadow: 1px 1px #89b4fa, 2px 2px #89b4fa, 3px 3px #89b4fa, 4px 4px rgba(137, 180, 250, 0.3) !important;' },
      { name: 'Outline text', css: '-webkit-text-stroke: 1px #cdd6f4 !important; color: transparent !important;' },
      { name: 'Uppercase tracking', css: 'text-transform: uppercase !important; letter-spacing: 3px !important; font-weight: 600 !important;' },
      { name: 'Smallcaps', css: 'font-variant: small-caps !important; letter-spacing: 1px !important;' },
    ],
  },
  {
    label: 'Backgrounds',
    tab: 'flair',
    snippets: [
      { name: 'Diagonal stripes', css: 'background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(137, 180, 250, 0.05) 10px, rgba(137, 180, 250, 0.05) 20px) !important;' },
      { name: 'Dot grid', css: 'background-image: radial-gradient(circle, #45475a 1px, transparent 1px) !important; background-size: 16px 16px !important;' },
      { name: 'Checkerboard', css: 'background-image: linear-gradient(45deg, rgba(69, 71, 90, 0.3) 25%, transparent 25%, transparent 75%, rgba(69, 71, 90, 0.3) 75%), linear-gradient(45deg, rgba(69, 71, 90, 0.3) 25%, transparent 25%, transparent 75%, rgba(69, 71, 90, 0.3) 75%) !important; background-size: 20px 20px !important; background-position: 0 0, 10px 10px !important;' },
      { name: 'Noise texture', css: 'background-image: url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.7\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.05\'/%3E%3C/svg%3E") !important;' },
      { name: 'Mesh gradient', css: 'background: radial-gradient(at 40% 20%, rgba(137, 180, 250, 0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(203, 166, 247, 0.3) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(166, 227, 161, 0.2) 0px, transparent 50%) !important;' },
    ],
  },
  {
    label: 'Scrollbar',
    tab: 'flair',
    snippets: [
      { name: 'Thin scrollbar', css: 'scrollbar-width: thin !important;' },
      { name: 'Hidden scrollbar', css: 'scrollbar-width: none !important;' },
      { name: 'Accent scrollbar', css: 'scrollbar-color: #89b4fa #1e1e2e !important;' },
      { name: 'Minimal scrollbar', css: 'scrollbar-color: #45475a transparent !important; scrollbar-width: thin !important;' },
    ],
  },
];

export default Vue.extend({
  name: 'TheSnippetLibrary',

  data(): {
    categories: SnippetCategory[];
    activeTab: 'utilities' | 'flair';
    previewingKey: string | null;
    previewCssBackup: string | null;
  } {
    return {
      categories: SNIPPET_CATEGORIES,
      activeTab: 'utilities',
      previewingKey: null,
      previewCssBackup: null,
    };
  },

  computed: {
    activeSelector(): string {
      return this.$store.state.activeSelector;
    },

    activeRule(): unknown {
      return this.$store.getters.activeRule;
    },

    visibleCategories(): SnippetCategory[] {
      return this.categories.filter(c => c.tab === this.activeTab);
    },
  },

  methods: {
    snippetKey(catIndex: number, snippetIndex: number): string {
      return `${catIndex}-${snippetIndex}`;
    },

    parseDeclarations(css: string): Array<{ property: string; value: string }> {
      return css
        .split(';')
        .filter(d => d.trim())
        .map(d => {
          const [property, ...valueParts] = d.split(':');
          return {
            property: property.trim(),
            value: valueParts.join(':').trim(),
          };
        })
        .filter(d => d.property && d.value);
    },

    isInstalled(snippet: Snippet): boolean {
      const rule = this.activeRule as { clone: () => { walkDecls: (prop: string, cb: (decl: Declaration) => void) => void } } | null;
      if (!rule) return false;

      const declarations = this.parseDeclarations(snippet.css);
      if (declarations.length === 0) return false;

      let matchCount = 0;
      const cloned = rule.clone();

      for (const decl of declarations) {
        cloned.walkDecls(decl.property, (found: Declaration) => {
          if (found.value === decl.value) {
            matchCount++;
          }
        });
      }

      return matchCount >= declarations.length;
    },

    installSnippet(snippet: Snippet): void {
      if (!this.activeSelector) return;

      // Inject keyframes if needed
      if (snippet.keyframes) {
        const css = this.$store.state.css || '';
        if (!css.includes(snippet.keyframes.split('{')[0].trim())) {
          this.$store.dispatch('applyCss', {
            css: css + '\n\n' + snippet.keyframes,
          });
        }
      }

      const declarations = this.parseDeclarations(snippet.css);
      for (const decl of declarations) {
        this.$store.dispatch('applyDeclaration', {
          property: decl.property,
          value: decl.value,
        });
      }
    },

    removeSnippet(snippet: Snippet): void {
      if (!this.activeSelector) return;

      const declarations = this.parseDeclarations(snippet.css);
      for (const decl of declarations) {
        this.$store.dispatch('applyDeclaration', {
          property: decl.property,
          value: '',
        });
      }
    },

    startPreview(snippet: Snippet, catIndex: number, snippetIndex: number): void {
      if (!this.activeSelector || this.isInstalled(snippet)) return;

      this.previewCssBackup = this.$store.state.css;
      this.previewingKey = this.snippetKey(catIndex, snippetIndex);

      // Temporarily inject keyframes for preview
      if (snippet.keyframes) {
        const css = this.$store.state.css || '';
        if (!css.includes(snippet.keyframes.split('{')[0].trim())) {
          this.$store.dispatch('applyCss', {
            css: css + '\n\n' + snippet.keyframes,
          });
        }
      }

      const declarations = this.parseDeclarations(snippet.css);
      for (const decl of declarations) {
        this.$store.dispatch('applyDeclaration', {
          property: decl.property,
          value: decl.value,
        });
      }
    },

    stopPreview(): void {
      if (this.previewCssBackup !== null) {
        this.$store.dispatch('applyCss', { css: this.previewCssBackup });
        this.previewCssBackup = null;
      }
      this.previewingKey = null;
    },
  },
});
</script>

<style lang="scss" scoped>
.snippet-library {
  font-size: 12px;
}

.snippet-empty {
  color: #6c7086;
  font-size: 12px;
  text-align: center;
  padding: 12px 0;
}

.snippet-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 10px;
  border-bottom: 1px solid #45475a;
}

.snippet-tab {
  flex: 1;
  text-align: center;
  padding: 5px 0;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6c7086;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease;

  &:hover {
    color: #a6adc8;
  }

  &.active {
    color: #89b4fa;
    border-bottom-color: #89b4fa;
  }
}

.snippet-category {
  margin-bottom: 10px;
}

.snippet-category-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: #6c7086;
  padding: 2px 0;
  letter-spacing: 0.5px;
}

.snippet-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  border-radius: 4px;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(137, 180, 250, 0.06);

    .snippet-actions {
      opacity: 1;
    }
  }

  &.installed {
    .snippet-actions {
      opacity: 1;
    }
  }

  &.previewing {
    background: rgba(137, 180, 250, 0.1);
    border-left: 2px solid #89b4fa;
    padding-left: 4px;
  }
}

.snippet-name {
  color: #cdd6f4;
  font-size: 12px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snippet-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
  margin-left: 6px;
}

.snippet-btn {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
  user-select: none;
}

.snippet-preview-btn {
  color: #6c7086;
  background: transparent;

  &:hover,
  &.active {
    color: #89b4fa;
    background: rgba(137, 180, 250, 0.12);
  }
}

.snippet-install-btn {
  color: #a6e3a1;
  background: rgba(166, 227, 161, 0.1);

  &:hover {
    background: rgba(166, 227, 161, 0.2);
  }
}

.snippet-remove-btn {
  color: #f38ba8;
  background: rgba(243, 139, 168, 0.1);

  &:hover {
    background: rgba(243, 139, 168, 0.2);
  }
}
</style>
