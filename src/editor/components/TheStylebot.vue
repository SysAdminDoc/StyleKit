<template>
  <the-stylebot-resizer>
    <the-header />

    <div
      class="stylebot-body"
      :style="colorPickerVisible ? 'pointer-events: none' : ''"
    >
      <the-basic-editor v-if="mode === 'basic'" />
      <the-magic-editor v-else-if="mode === 'magic'" />
      <the-code-editor v-else-if="mode === 'code' && !resizing" />
    </div>

    <the-toast />
    <the-footer @show-diff="showDiff = true" />

    <the-css-diff-view
      :visible="showDiff"
      @close="showDiff = false"
    />
  </the-stylebot-resizer>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import TheHeader from './TheHeader.vue';
import TheFooter from './TheFooter.vue';
import TheCodeEditor from './TheCodeEditor.vue';
import TheBasicEditor from './TheBasicEditor.vue';
import TheMagicEditor from './TheMagicEditor.vue';
import TheStylebotResizer from './TheStylebotResizer.vue';
import TheCssDiffView from './TheCssDiffView.vue';
import TheToast from './TheToast.vue';

import { StylebotEditingMode } from '@stylekit/types';

export default defineComponent({
  name: 'TheStylebot',

  components: {
    TheHeader,
    TheFooter,
    TheBasicEditor,
    TheMagicEditor,
    TheCodeEditor,
    TheStylebotResizer,
    TheCssDiffView,
    TheToast,
  },

  data() {
    return {
      showDiff: false,
    };
  },

  computed: {
    resizing(): boolean {
      return this.$store.state.resizing;
    },

    mode(): StylebotEditingMode {
      return this.$store.state.options.mode;
    },

    colorPickerVisible(): boolean {
      return this.$store.state.colorPickerVisible;
    },
  },
});
</script>

<style lang="scss">
.stylebot {
  top: 0;
  padding: 0;
  color: #cdd6f4;
  line-height: 20px;
  background: #1e1e2e;
  display: flex;
  flex-direction: column;
}

.stylebot-body {
  overflow: auto;
  flex: 1;
  min-height: 0;
}
</style>
