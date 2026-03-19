<template>
  <div class="selector-picker-wrapper">
    <b-button
      size="sm"
      variant="outline-secondary"
      :disabled="!activeSelector"
      title="Element selector picker"
      class="selector-picker-btn"
      @click="openPicker"
    >
      <b-icon icon="list-ul" aria-hidden="true" />
    </b-button>

    <div v-if="open" class="picker-backdrop" @mousedown.self="close">
      <div class="picker-dialog">
        <textarea class="picker-textarea" :value="currentSelector" readonly />

        <div class="picker-sliders-row">
          <input
            v-model.number="depthValue"
            type="range"
            class="picker-slider"
            :min="0"
            :max="maxDepth"
          />
          <input
            v-model.number="classValue"
            type="range"
            class="picker-slider"
            :min="0"
            :max="maxClasses"
          />
          <span class="picker-match-count">{{ matchCount }}</span>
        </div>

        <div class="picker-actions">
          <button class="picker-btn picker-btn-cancel" @click="close">Cancel</button>
          <button class="picker-btn picker-btn-apply" @click="applySelector">Apply</button>
        </div>

        <div class="picker-candidates-label">Selector alternatives</div>
        <div class="picker-candidates">
          <div
            v-for="s in candidates"
            :key="s"
            class="picker-candidate"
            :class="{ 'picker-candidate-active': s === currentSelector }"
            @click="selectCandidate(s)"
            @mouseenter="highlightSelector(s)"
            @mouseleave="restoreCurrentHighlight"
          >
            {{ s }}
          </div>
          <div v-if="candidates.length === 0" class="picker-empty">
            No element found for current selector
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { validateSelector } from '@stylekit/css';
import { Highlighter } from '@stylekit/highlighter';

interface ElementInfo {
  tag: string;
  id: string;
  classes: string[];
}

export default defineComponent({
  name: 'TheSelectorPicker',

  data(): {
    open: boolean;
    chain: ElementInfo[];
    depthValue: number;
    classValue: number;
    candidates: string[];
    highlighter: Highlighter | null;
  } {
    return {
      open: false,
      chain: [],
      depthValue: 0,
      classValue: 0,
      candidates: [],
      highlighter: null,
    };
  },

  computed: {
    activeSelector(): string {
      return this.$store.state.activeSelector;
    },

    maxDepth(): number {
      return Math.max(0, this.chain.length - 1);
    },

    maxClasses(): number {
      const focused = this.chain[this.depthValue];
      return focused ? focused.classes.length : 0;
    },

    currentSelector(): string {
      return this.buildSelector(this.depthValue, this.classValue);
    },

    matchCount(): number {
      const sel = this.currentSelector;
      if (!sel || !validateSelector(sel)) return 0;
      try {
        return document.querySelectorAll(sel).length;
      } catch {
        return 0;
      }
    },
  },

  watch: {
    depthValue() {
      if (this.classValue > this.maxClasses) {
        this.classValue = this.maxClasses;
      }
    },

    currentSelector(sel: string) {
      if (sel && validateSelector(sel)) {
        this.highlighter?.highlight(sel);
      }
    },
  },

  created() {
    this.highlighter = new Highlighter({ onSelect: () => {} });
  },

  beforeUnmount() {
    this.highlighter?.unhighlight();
    window.removeEventListener('keydown', this.onKeyDown);
  },

  methods: {
    openPicker() {
      if (!this.activeSelector) return;
      this.chain = this.buildChain(this.activeSelector);
      this.depthValue = 0;
      this.classValue = this.chain.length ? this.chain[0].classes.length : 0;
      this.candidates = this.generateCandidates();
      this.open = true;
      this.$nextTick(() => {
        window.addEventListener('keydown', this.onKeyDown);
        const sel = this.currentSelector;
        if (sel && validateSelector(sel)) {
          this.highlighter?.highlight(sel);
        }
      });
    },

    close() {
      this.open = false;
      this.highlighter?.unhighlight();
      window.removeEventListener('keydown', this.onKeyDown);
    },

    onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') this.close();
    },

    applySelector() {
      const sel = this.currentSelector;
      if (sel) {
        this.highlighter?.unhighlight();
        this.$store.commit('setActiveSelector', sel);
      }
      this.close();
    },

    selectCandidate(selector: string) {
      // Sync sliders to match this candidate
      for (let d = 0; d < this.chain.length; d++) {
        const el = this.chain[d];
        for (let c = 0; c <= el.classes.length; c++) {
          if (this.buildSelector(d, c) === selector) {
            this.depthValue = d;
            this.classValue = c;
            return;
          }
        }
      }
    },

    highlightSelector(selector: string) {
      if (validateSelector(selector)) {
        this.highlighter?.highlight(selector);
      }
    },

    restoreCurrentHighlight() {
      const sel = this.currentSelector;
      if (sel && validateSelector(sel)) {
        this.highlighter?.highlight(sel);
      }
    },

    buildChain(selector: string): ElementInfo[] {
      try {
        const el = document.querySelector(selector);
        if (!el) return [];
        const chain: ElementInfo[] = [];
        let cur: Element | null = el;
        while (cur && !['html', 'body'].includes(cur.tagName.toLowerCase())) {
          chain.push({
            tag: cur.tagName.toLowerCase(),
            id: cur.getAttribute('id')?.trim() || '',
            classes: Array.from(cur.classList)
              .map(c => c.trim())
              .filter(c => c && /^[a-zA-Z_-]/.test(c)),
          });
          cur = cur.parentElement;
          if (chain.length >= 6) break;
        }
        return chain;
      } catch {
        return [];
      }
    },

    buildSelector(depth: number, classCount: number): string {
      if (!this.chain.length) return '';
      const d = Math.min(depth, this.chain.length - 1);
      const focused = this.chain[d];
      if (!focused) return '';

      let focusedSel: string;
      if (focused.id && classCount === 0) {
        focusedSel = `#${focused.id}`;
      } else {
        const cls = focused.classes.slice(0, classCount);
        focusedSel = focused.id
          ? `#${focused.id}` + (cls.length ? `.${cls.join('.')}` : '')
          : cls.length
            ? `${focused.tag}.${cls.join('.')}`
            : focused.tag;
      }

      if (d === 0) return focusedSel;

      // Append descendant path from focused down to chain[0]
      const parts = [focusedSel];
      for (let i = d - 1; i >= 0; i--) {
        const el = this.chain[i];
        parts.push(el.id ? `#${el.id}` : el.classes.length ? `.${el.classes[0]}` : el.tag);
      }
      return parts.join(' ');
    },

    generateCandidates(): string[] {
      const result: string[] = [];
      for (let d = 0; d < this.chain.length; d++) {
        const el = this.chain[d];
        if (el.id) result.push(this.buildSelector(d, 0));
        for (let c = el.classes.length; c >= 0; c--) {
          result.push(this.buildSelector(d, c));
        }
      }
      return [...new Set(result)].filter(s => {
        try {
          document.querySelector(s);
          return true;
        } catch {
          return false;
        }
      });
    },
  },
});
</script>

<style lang="scss">
.selector-picker-wrapper {
  display: inline-block;
}

.selector-picker-btn {
  .btn {
    font-size: 12px !important;
    padding: 0 6px !important;
  }
}

.picker-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 999999998;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
}

.picker-dialog {
  background: #1e1e2e;
  border: 1px solid #45475a;
  border-radius: 6px;
  width: 520px;
  max-width: 92vw;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.picker-textarea {
  width: 100%;
  height: 72px;
  background: #11111b;
  border: none;
  border-bottom: 1px solid #313244;
  color: #89b4fa;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  padding: 10px 12px;
  resize: none;
  outline: none;
  box-sizing: border-box;
  display: block;
}

.picker-sliders-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #181825;
  border-bottom: 1px solid #313244;
}

.picker-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: #45475a;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #89b4fa;
    cursor: pointer;
    border: 2px solid #1e1e2e;
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #89b4fa;
    cursor: pointer;
    border: 2px solid #1e1e2e;
  }
}

.picker-match-count {
  min-width: 28px;
  height: 22px;
  background: #313244;
  color: #89b4fa;
  font-size: 11px;
  font-weight: 700;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.picker-actions {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #181825;
  border-bottom: 1px solid #313244;
}

.picker-btn {
  font-size: 13px;
  font-weight: 600;
  padding: 5px 20px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.85;
  }
}

.picker-btn-cancel {
  background: #313244;
  color: #cdd6f4;
}

.picker-btn-apply {
  background: #89b4fa;
  color: #1e1e2e;
}

.picker-candidates-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6c7086;
  padding: 8px 12px 4px;
}

.picker-candidates {
  max-height: 220px;
  overflow-y: auto;
  padding-bottom: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 3px;
  }
}

.picker-candidate {
  padding: 6px 12px;
  font-size: 12px;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  color: #cdd6f4;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-left: 3px solid transparent;
  transition: background 0.1s;

  &:hover {
    background: rgba(137, 180, 250, 0.08);
    color: #89b4fa;
    border-left-color: rgba(137, 180, 250, 0.4);
  }
}

.picker-candidate-active {
  background: rgba(137, 180, 250, 0.12);
  color: #89b4fa;
  border-left-color: #89b4fa !important;
}

.picker-empty {
  padding: 10px 12px;
  font-size: 12px;
  color: #6c7086;
}
</style>
