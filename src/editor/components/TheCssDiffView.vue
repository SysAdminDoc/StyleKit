<template>
  <div v-if="visible" class="css-diff-overlay" @click.self="$emit('close')">
    <div
      class="css-diff-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stylekit-css-diff-title"
    >
      <div class="css-diff-header">
        <div>
          <div id="stylekit-css-diff-title" class="css-diff-title">
            CSS Changes
          </div>
          <div v-if="previousVersion" class="css-diff-context">
            Compared with saved version from
            <time :datetime="previousVersion.savedAt">{{ savedAtLabel }}</time>
          </div>
        </div>
        <button
          type="button"
          class="css-diff-close"
          aria-label="Close CSS changes"
          @click="$emit('close')"
        >
          &times;
        </button>
      </div>

      <div v-if="loading" class="css-diff-empty">Loading saved version...</div>

      <div v-else-if="!previousVersion" class="css-diff-empty">
        No previous saved version yet
      </div>

      <div v-else-if="diffLines.length === 0" class="css-diff-empty">
        No changes from the previous saved version
      </div>

      <div v-else class="css-diff-body">
        <div
          v-for="(line, index) in diffLines"
          :key="index"
          class="css-diff-line"
          :class="line.type"
        >
          <span class="css-diff-indicator">{{ line.indicator }}</span>
          <span class="css-diff-text">{{ line.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { StyleVersionSnapshot } from '@stylekit/types';
import { getStyleVersion } from '../utils/chrome';

type DiffLine = {
  type: 'added' | 'removed' | 'unchanged';
  indicator: string;
  text: string;
};

export default defineComponent({
  name: 'TheCssDiffView',

  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },

  data(): {
    loading: boolean;
    previousVersion: StyleVersionSnapshot | null;
  } {
    return {
      loading: false,
      previousVersion: null,
    };
  },

  computed: {
    originalCss(): string {
      return this.previousVersion?.css || '';
    },

    currentCss(): string {
      return this.$store.state.css;
    },

    savedAtLabel(): string {
      if (!this.previousVersion) return '';
      const date = new Date(this.previousVersion.savedAt);
      return Number.isNaN(date.getTime())
        ? this.previousVersion.savedAt
        : date.toLocaleString();
    },

    diffLines(): DiffLine[] {
      const oldLines = this.originalCss.split('\n');
      const newLines = this.currentCss.split('\n');

      if (this.originalCss === this.currentCss) return [];

      // Simple line-by-line diff using LCS
      const result: DiffLine[] = [];
      const lcs = this.computeLcs(oldLines, newLines);
      let oi = 0;
      let ni = 0;
      let li = 0;

      while (oi < oldLines.length || ni < newLines.length) {
        if (li < lcs.length && oi < oldLines.length && oldLines[oi] === lcs[li]) {
          if (ni < newLines.length && newLines[ni] === lcs[li]) {
            result.push({ type: 'unchanged', indicator: ' ', text: lcs[li] });
            oi++;
            ni++;
            li++;
          } else if (ni < newLines.length) {
            result.push({ type: 'added', indicator: '+', text: newLines[ni] });
            ni++;
          }
        } else if (oi < oldLines.length) {
          if (li < lcs.length || oi < oldLines.length) {
            result.push({ type: 'removed', indicator: '-', text: oldLines[oi] });
            oi++;
          }
        } else if (ni < newLines.length) {
          result.push({ type: 'added', indicator: '+', text: newLines[ni] });
          ni++;
        }
      }

      return result;
    },
  },

  watch: {
    visible: {
      immediate: true,
      handler(visible: boolean): void {
        if (visible) void this.loadPreviousVersion();
      },
    },
  },

  methods: {
    async loadPreviousVersion(): Promise<void> {
      this.loading = true;
      try {
        this.previousVersion = await getStyleVersion(this.$store.state.url);
      } finally {
        this.loading = false;
      }
    },

    computeLcs(a: string[], b: string[]): string[] {
      const m = a.length;
      const n = b.length;
      const dp: number[][] = Array.from({ length: m + 1 }, () =>
        new Array(n + 1).fill(0)
      );

      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          dp[i][j] =
            a[i - 1] === b[j - 1]
              ? dp[i - 1][j - 1] + 1
              : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }

      const result: string[] = [];
      let i = m;
      let j = n;

      while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
          result.unshift(a[i - 1]);
          i--;
          j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
          i--;
        } else {
          j--;
        }
      }

      return result;
    },
  },
});
</script>

<style lang="scss" scoped>
.css-diff-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000001;
  display: flex;
  align-items: center;
  justify-content: center;
}

.css-diff-panel {
  width: 600px;
  max-width: 90%;
  max-height: 80%;
  background: #1e1e2e;
  border: 1px solid #45475a;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.css-diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #45475a;
  background: #181825;
}

.css-diff-title {
  font-size: 14px;
  font-weight: 600;
  color: #cdd6f4;
}

.css-diff-context {
  color: #a6adc8;
  font-size: 11px;
  margin-top: 2px;
}

.css-diff-close {
  appearance: none;
  background: transparent;
  border: 0;
  font-size: 20px;
  color: #6c7086;
  cursor: pointer;
  line-height: 1;

  &:hover {
    color: #f38ba8;
  }
}

.css-diff-empty {
  padding: 24px;
  text-align: center;
  color: #6c7086;
  font-size: 13px;
}

.css-diff-body {
  overflow: auto;
  padding: 8px 0;
  flex: 1;
}

.css-diff-line {
  display: flex;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px;
  line-height: 1.6;
  padding: 0 12px;

  &.added {
    background: rgba(166, 227, 161, 0.1);
    color: #a6e3a1;
  }

  &.removed {
    background: rgba(243, 139, 168, 0.1);
    color: #f38ba8;
  }

  &.unchanged {
    color: #6c7086;
  }
}

.css-diff-indicator {
  width: 16px;
  flex-shrink: 0;
  text-align: center;
  user-select: none;
}

.css-diff-text {
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
