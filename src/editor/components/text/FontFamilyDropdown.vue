<template>
  <div>
    <dropdown-hack-to-support-shadow-dom>
      <b-dropdown
        right
        size="sm"
        :text="text"
        :disabled="disabled"
        variant="outline-secondary"
        class="font-family-dropdown"
      >
        <b-dropdown-item v-if="!hideDefault" @click="$emit('select', '')">
          {{ t('default') }}
        </b-dropdown-item>

        <template v-if="fonts.length > 0">
          <b-dropdown-header>Your Fonts</b-dropdown-header>

          <b-dropdown-item
            v-for="font in fonts"
            :key="font"
            :style="{ fontFamily: font }"
            @click="$emit('select', font)"
          >
            {{ font }}
          </b-dropdown-item>
        </template>

        <b-dropdown-divider />
        <b-dropdown-header>Common Fonts</b-dropdown-header>

        <b-dropdown-item
          v-for="font in systemFonts"
          :key="'sys-' + font"
          :style="{ fontFamily: font }"
          @click="$emit('select', font)"
        >
          {{ font }}
        </b-dropdown-item>

        <b-dropdown-divider />
        <b-dropdown-item @click="editFonts">
          {{ t('fonts_edit_list') }}
        </b-dropdown-item>
      </b-dropdown>
    </dropdown-hack-to-support-shadow-dom>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { t } from '@stylekit/i18n';

import { openOptionsPage } from '../../utils/chrome';

import DropdownHackToSupportShadowDom from './../DropdownHackToSupportShadowDom.vue';

export default defineComponent({
  name: 'FontFamilyDropdown',

  components: {
    DropdownHackToSupportShadowDom,
  },

  props: {
    disabled: {
      type: Boolean,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    fonts: {
      type: Array,
      required: true,
    },
    hideDefault: {
      type: Boolean,
      required: false,
    },
  },

  data() {
    return {
      systemFonts: [
        'Arial',
        'Georgia',
        'Helvetica',
        'Times New Roman',
        'Verdana',
        'Courier New',
        'Trebuchet MS',
        'Tahoma',
        'Segoe UI',
        'system-ui',
        'sans-serif',
        'serif',
        'monospace',
        'cursive',
      ],
    };
  },

  computed: {
    text: {
      get(): string {
        if (!this.value) {
          return t('default');
        }

        return this.value;
      },
    },
  },

  methods: {
    editFonts() {
      openOptionsPage();
    },
  },
});
</script>

<style lang="scss">
.font-family-dropdown {
  .dropdown-toggle {
    border-top-left-radius: 3.2px !important;
    border-bottom-left-radius: 3.2px !important;
  }

  .dropdown-menu {
    max-height: 300px;
    overflow-y: auto;
  }

  .dropdown-header {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #6c7086;
    padding: 4px 16px 2px;
  }
}
</style>
