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
        @shown="onDropdownShown"
      >
        <div class="font-search-wrapper">
          <input
            ref="fontSearch"
            v-model="search"
            class="font-search-input"
            type="text"
            placeholder="Search fonts..."
            autocomplete="off"
            @keydown.stop
          />
        </div>

        <b-dropdown-item v-if="!hideDefault && !search" @click="$emit('select', '')">
          {{ t('default') }}
        </b-dropdown-item>

        <template v-if="!search && fonts.length > 0">
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

        <template v-if="!search">
          <b-dropdown-divider />
          <b-dropdown-header>System Fonts</b-dropdown-header>
        </template>
        <b-dropdown-item
          v-for="font in filteredSystemFonts"
          :key="'sys-' + font"
          :style="{ fontFamily: font }"
          @click="$emit('select', font)"
        >
          {{ font }}
        </b-dropdown-item>

        <template v-if="filteredGoogleFonts.length > 0">
          <b-dropdown-divider />
          <b-dropdown-header>Google Fonts{{ googleFontsLoading ? ' (loading...)' : '' }}</b-dropdown-header>
          <b-dropdown-item
            v-for="font in filteredGoogleFonts"
            :key="'gf-' + font"
            @click="$emit('select', font)"
          >
            {{ font }}
          </b-dropdown-item>
        </template>

        <div v-if="search && filteredSystemFonts.length === 0 && filteredGoogleFonts.length === 0" class="font-no-results">
          No fonts matching "{{ search }}"
        </div>

        <b-dropdown-divider v-if="!search" />
        <b-dropdown-item v-if="!search" @click="editFonts">
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

const GOOGLE_FONTS_CACHE_KEY = 'stylekit-google-fonts';
const GOOGLE_FONTS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

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
      search: '',
      googleFonts: [] as string[],
      googleFontsLoading: false,
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

    filteredSystemFonts(): string[] {
      if (!this.search) return this.systemFonts;
      const q = this.search.toLowerCase();
      return this.systemFonts.filter(f => f.toLowerCase().includes(q));
    },

    filteredGoogleFonts(): string[] {
      if (!this.search) return this.googleFonts.slice(0, 50);
      const q = this.search.toLowerCase();
      return this.googleFonts.filter(f => f.toLowerCase().includes(q)).slice(0, 50);
    },
  },

  async created() {
    await this.loadGoogleFonts();
  },

  methods: {
    onDropdownShown(): void {
      this.search = '';
      this.$nextTick(() => {
        (this.$refs.fontSearch as HTMLInputElement)?.focus();
      });
    },

    async loadGoogleFonts(): Promise<void> {
      try {
        const cached = await chrome.storage.local.get(GOOGLE_FONTS_CACHE_KEY);
        const entry = cached[GOOGLE_FONTS_CACHE_KEY] as { fonts: string[]; ts: number } | undefined;

        if (entry && Date.now() - entry.ts < GOOGLE_FONTS_TTL_MS) {
          this.googleFonts = entry.fonts;
          return;
        }

        this.googleFontsLoading = true;
        const res = await fetch(
          'https://fonts.googleapis.com/metadata/fonts?capability=WOFF2',
          { referrerPolicy: 'no-referrer' }
        );

        if (!res.ok) return;

        const text = await res.text();
        // Google's metadata endpoint returns JSON with a )]}' prefix
        const json = JSON.parse(text.replace(/^\)\]\}'?\n?/, ''));
        const fonts: string[] = (json.familyMetadataList || [])
          .map((f: { family: string }) => f.family)
          .sort();

        this.googleFonts = fonts;
        await chrome.storage.local.set({
          [GOOGLE_FONTS_CACHE_KEY]: { fonts, ts: Date.now() },
        });
      } catch (e) {
        console.warn('StyleKit: failed to load Google Fonts list', e);
      } finally {
        this.googleFontsLoading = false;
      }
    },

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
    max-height: 340px;
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

.font-search-wrapper {
  padding: 4px 8px 6px;
  position: sticky;
  top: 0;
  background: #1e1e2e;
  z-index: 1;
}

.font-search-input {
  width: 100%;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 4px;
  color: #cdd6f4;
  font-size: 11px;
  padding: 4px 8px;
  outline: none;
  box-sizing: border-box;

  &::placeholder {
    color: #585b70;
  }

  &:focus {
    border-color: #89b4fa;
  }
}

.font-no-results {
  padding: 8px 16px;
  font-size: 12px;
  color: #6c7086;
  text-align: center;
}
</style>
