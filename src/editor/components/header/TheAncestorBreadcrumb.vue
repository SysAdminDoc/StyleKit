<template>
  <div v-if="ancestors.length > 0" class="ancestor-breadcrumb">
    <span
      v-for="(ancestor, index) in ancestors"
      :key="index"
      class="ancestor-item"
      :title="ancestor.selector"
      @click="selectAncestor(ancestor.selector)"
    >
      <span class="ancestor-tag">{{ ancestor.tag }}</span>
      <span v-if="ancestor.id" class="ancestor-id">#{{ ancestor.id }}</span>
      <span v-if="ancestor.className" class="ancestor-class">.{{ ancestor.className }}</span>
      <span v-if="index < ancestors.length - 1" class="ancestor-separator">&rsaquo;</span>
    </span>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { getSelector } from '@stylebot/css';

type AncestorInfo = {
  tag: string;
  id: string;
  className: string;
  selector: string;
};

export default Vue.extend({
  name: 'TheAncestorBreadcrumb',

  computed: {
    activeSelector(): string {
      return this.$store.state.activeSelector;
    },

    ancestors(): AncestorInfo[] {
      if (!this.activeSelector) return [];

      try {
        const el = document.querySelector(this.activeSelector) as HTMLElement | null;
        if (!el) return [];

        const chain: AncestorInfo[] = [];
        let current: HTMLElement | null = el.parentElement;
        let depth = 0;

        while (current && current !== document.body && current !== document.documentElement && depth < 5) {
          const tag = current.tagName.toLowerCase();
          const id = current.getAttribute('id') || '';
          const classList = current.getAttribute('class')?.trim().split(/\s+/) || [];
          const firstClass = classList[0] || '';

          chain.unshift({
            tag,
            id,
            className: firstClass,
            selector: getSelector(current),
          });

          current = current.parentElement;
          depth++;
        }

        return chain;
      } catch {
        return [];
      }
    },
  },

  methods: {
    selectAncestor(selector: string): void {
      this.$store.commit('setActiveSelector', selector);
    },
  },
});
</script>

<style lang="scss" scoped>
.ancestor-breadcrumb {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  padding: 2px 8px 4px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.ancestor-item {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  padding: 1px 4px;
  border-radius: 3px;
  white-space: nowrap;
  transition: background 0.15s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(137, 180, 250, 0.1);
  }
}

.ancestor-tag {
  font-size: 10px;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  color: #f38ba8;
}

.ancestor-id {
  font-size: 10px;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  color: #cba6f7;
}

.ancestor-class {
  font-size: 10px;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  color: #a6e3a1;
}

.ancestor-separator {
  font-size: 12px;
  color: #585b70;
  margin: 0 2px;
}
</style>
