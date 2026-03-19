<template>
  <div class="pt-3 pb-5">
    <style-editor
      v-if="addStyleDialog"
      @save="
        saveStyle($event);
        addStyleDialog = false;
      "
      @cancel="addStyleDialog = false"
    />

    <style-import-from-url
      v-if="importDialog"
      @import="
        saveStyle({ url: $event.url, css: $event.css });
        importDialog = false;
      "
      @cancel="importDialog = false"
    />

    <b-row no-gutters class="mt-5">
      <b-col cols="12">
        <b-row>
          <b-col cols="8">
            <app-button
              variant="primary"
              text="Add a new style..."
              @click="addStyleDialog = true"
            >
              {{ t('add_new_style') }}
            </app-button>

            <app-button @click="importDialog = true">
              Import from URL
            </app-button>

            <app-button @click="enableAll">
              {{ t('enable_all_styles') }}
            </app-button>

            <app-button @click="disableAll">
              {{ t('disable_all_styles') }}
            </app-button>
          </b-col>

          <b-col cols="4">
            <b-row align-h="end" no-gutters>
              <the-delete-all-styles-button @click="deleteAll" />
            </b-row>
          </b-col>
        </b-row>

        <b-row>
          <b-col cols="12" class="py-3">
            <b-form-input
              class="search"
              placeholder="Search..."
              @input="setUrlFilter"
            />
          </b-col>
        </b-row>

        <style-component
          v-for="style in styles"
          :key="style.url"
          :css="style.css"
          :url="style.url"
          :modified-time="style.modifiedTime"
          :initial-enabled="style.enabled"
          @save="saveStyle"
          @delete="deleteStyle(style)"
          @toggle="toggleStyle(style)"
        />
      </b-col>
    </b-row>

    <undo-toast
      :visible="toast.visible"
      :message="toast.message"
      @undo="undoDelete"
      @expire="commitDelete"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { compareAsc } from 'date-fns';

import { Style, StyleMap } from '@stylekit/types';

import AppButton from './AppButton.vue';
import UndoToast from './UndoToast.vue';
import StyleComponent from './styles/Style.vue';
import StyleEditor from './styles/StyleEditor.vue';
import StyleImportFromUrl from './styles/StyleImportFromUrl.vue';
import TheDeleteAllStylesButton from './styles/TheDeleteAllStylesButton.vue';

export default defineComponent({
  name: 'TheStylesTab',

  components: {
    AppButton,
    UndoToast,
    StyleEditor,
    StyleImportFromUrl,
    StyleComponent,
    TheDeleteAllStylesButton,
  },

  data(): {
    urlFilter: string;
    addStyleDialog: boolean;
    importDialog: boolean;
    toast: {
      visible: boolean;
      message: string;
    };
    savedStyles: StyleMap | null;
  } {
    return {
      urlFilter: '',
      addStyleDialog: false,
      importDialog: false,
      toast: {
        visible: false,
        message: '',
      },
      savedStyles: null,
    };
  },

  computed: {
    styles(): Array<Style> {
      const stylesObj = this.$store.state.styles;
      const styles: Array<Style> = [];

      for (const url in stylesObj) {
        if (url.indexOf(this.urlFilter) !== -1) {
          styles.push({
            url,
            css: stylesObj[url].css,
            enabled: stylesObj[url].enabled,
            readability: stylesObj[url].readability,
            modifiedTime: stylesObj[url].modifiedTime,
          });
        }
      }

      styles.sort((s1, s2) =>
        compareAsc(new Date(s2.modifiedTime), new Date(s1.modifiedTime))
      );

      return styles;
    },
  },

  methods: {
    setUrlFilter(str: string): void {
      this.urlFilter = str;
    },

    deleteStyle(style: Style): void {
      this.savedStyles = JSON.parse(
        JSON.stringify(this.$store.state.styles)
      );
      this.$store.dispatch('deleteStyle', style.url);
      this.showToast(`Deleted style for ${style.url}`);
    },

    toggleStyle(style: Style): void {
      if (style.enabled) {
        this.$store.dispatch('disableStyle', style.url);
      } else {
        this.$store.dispatch('enableStyle', style.url);
      }
    },

    enableAll(): void {
      this.$store.dispatch('enableAllStyles');
    },

    disableAll(): void {
      this.$store.dispatch('disableAllStyles');
    },

    deleteAll(): void {
      this.savedStyles = JSON.parse(
        JSON.stringify(this.$store.state.styles)
      );
      this.$store.dispatch('deleteAllStyles');
      this.showToast('Deleted all styles');
    },

    saveStyle({
      initialUrl,
      url,
      css,
    }: {
      initialUrl: string;
      url: string;
      css: string;
    }): void {
      this.$store.dispatch('saveStyle', { initialUrl, url, css });
    },

    showToast(message: string): void {
      this.toast.visible = false;
      this.$nextTick(() => {
        this.toast.message = message;
        this.toast.visible = true;
      });
    },

    undoDelete(): void {
      if (this.savedStyles) {
        this.$store.dispatch('setAllStyles', this.savedStyles);
        this.savedStyles = null;
      }
      this.toast.visible = false;
    },

    commitDelete(): void {
      this.savedStyles = null;
      this.toast.visible = false;
    },
  },
});
</script>

<style lang="scss" scoped>
.search {
  border: none;
  border-radius: 0;
  outline: none;

  &:focus {
    box-shadow: none;
  }
}
</style>
