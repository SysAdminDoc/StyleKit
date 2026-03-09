<template>
  <div class="style-editor">
    <div class="style-editor-overlay" />
    <div class="style-editor-modal">
      <div class="px-3 py-4">
        <b-form-input
          v-model="url"
          placeholder="Enter URL..."
          label="URL"
          autofocus
          style="max-width: 600px;"
        />
        <div class="url-pattern-help" style="max-width: 600px;">
          <span
            class="url-pattern-toggle"
            @click="showPatternHelp = !showPatternHelp"
          >
            {{ showPatternHelp ? 'Hide' : 'URL pattern help' }}
          </span>
          <div v-if="showPatternHelp" class="url-pattern-hints">
            <div><code>example.com</code> - matches domain and subdomains</div>
            <div><code>*.example.com/path/*</code> - wildcard matching</div>
            <div><code>^https://example\.com/user/\d+</code> - regex (prefix with ^)</div>
            <div><code>site1.com, site2.com</code> - multiple URLs (comma-separated)</div>
            <div><code>*</code> - matches all pages</div>
          </div>
        </div>
      </div>

      <div class="style-editor-code mx-3">
        <code-editor :css="css" @update="css = $event" />
      </div>

      <div class="style-editor-footer py-5 px-3">
        <app-button
          class="ml-3"
          variant="primary"
          :disabled="!url || !css"
          @click="$emit('save', { initialUrl, url, css })"
        >
          {{ t('save') }}
        </app-button>

        <app-button @click="$emit('cancel')">{{ t('cancel') }}</app-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import AppButton from '../AppButton.vue';
import CodeEditor from './CodeEditor.vue';

export default Vue.extend({
  name: 'StyleEditor',

  components: {
    AppButton,
    CodeEditor,
  },

  props: {
    initialUrl: {
      type: String,
      required: false,
      default: '',
    },

    initialCss: {
      type: String,
      required: false,
      default: '',
    },
  },

  data(): {
    url: string;
    css: string;
    showPatternHelp: boolean;
  } {
    return {
      url: this.initialUrl,
      css: this.initialCss,
      showPatternHelp: false,
    };
  },
});
</script>

<style lang="scss">
.style-editor {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100000;
}

.style-editor-overlay {
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  position: fixed;
  z-index: 100000;
  background: rgba(0, 0, 0, 0.5);
}

.style-editor-modal {
  height: 80%;
  width: 80%;
  padding: 20px;
  position: fixed;
  top: 10%;
  left: 10%;
  z-index: 100001;
}

.style-editor-code {
  height: 75%;
}

.style-editor-footer {
  button {
    float: right;
  }
}

.url-pattern-help {
  margin-top: 6px;
}

.url-pattern-toggle {
  font-size: 11px;
  color: #89b4fa;
  cursor: pointer;
  user-select: none;

  &:hover {
    color: #b4d0fb;
  }
}

.url-pattern-hints {
  margin-top: 6px;
  font-size: 11px;
  color: #a6adc8;
  line-height: 1.8;

  code {
    font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
    color: #cba6f7;
    background: rgba(203, 166, 247, 0.1);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 11px;
  }
}
</style>
