<template>
  <b-list-group-item class="style-row">
    <b-form-checkbox
      v-model="enabled"
      switch
      class="style-toggle"
      :disabled="disableToggle"
      @change="onChange"
    >
      {{ url }}
    </b-form-checkbox>

    <div class="style-actions">
      <button
        class="style-action-btn edit-btn"
        title="Edit style"
        @click="edit"
      >
        &#x270E;
      </button>
      <button
        class="style-action-btn delete-btn"
        title="Delete style"
        @click="deleteStyle"
      >
        &#x2715;
      </button>
    </div>
  </b-list-group-item>
</template>

<script lang="ts">
import Vue from 'vue';
import {
  EnableStyle,
  DisableStyle,
  SetStyle,
  ToggleStylebot,
} from '@stylebot/types';

export default Vue.extend({
  name: 'Style',
  props: {
    url: {
      type: String,
      required: true,
    },
    tab: {
      type: Object,
      default: undefined,
    },
    disableToggle: {
      type: Boolean,
    },
    initialEnabled: {
      type: Boolean,
    },
  },

  data(): {
    enabled: boolean;
  } {
    return {
      enabled: this.initialEnabled,
    };
  },

  methods: {
    onChange(): void {
      if (this.enabled) {
        this.enable();
      } else {
        this.disable();
      }
    },

    enable(): void {
      const message: EnableStyle = {
        name: 'EnableStyle',
        url: this.url,
      };

      chrome.runtime.sendMessage(message);
    },

    disable(): void {
      const message: DisableStyle = {
        name: 'DisableStyle',
        url: this.url,
      };

      chrome.runtime.sendMessage(message);
    },

    edit(): void {
      if (this.tab?.id) {
        const message: ToggleStylebot = {
          name: 'ToggleStylebot',
        };

        chrome.tabs.sendMessage(this.tab.id, message).catch(() => {});
        window.close();
      }
    },

    deleteStyle(): void {
      const message: SetStyle = {
        name: 'SetStyle',
        url: this.url,
        css: '',
        readability: false,
      };

      chrome.runtime.sendMessage(message);
      this.$emit('deleted', this.url);
    },
  },
});
</script>

<style lang="scss">
.style-row {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px !important;
}

.style-toggle {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.style-actions {
  display: flex;
  gap: 2px;
  margin-left: 8px;
  flex-shrink: 0;
}

.style-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 5px;
  font-size: 13px;
  line-height: 1;
  border-radius: 3px;
  color: #6c7086;
  transition: color 0.15s, background 0.15s;

  &:hover {
    color: #cdd6f4;
    background: #313244;
  }

  &.delete-btn:hover {
    color: #f38ba8;
    background: rgba(243, 139, 168, 0.1);
  }
}
</style>
