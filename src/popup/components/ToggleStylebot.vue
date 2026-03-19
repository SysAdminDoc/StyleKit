<template>
  <b-list-group-item
    button
    class="open-stylebot"
    :class="{ restricted }"
    :disabled="restricted"
    @click="toggle"
  >
    <inspector-icon />

    <span v-if="restricted" class="pl-2 restricted-text">Not available on this page</span>
    <span v-else-if="isOpen" class="pl-2">{{ t('close_stylebot') }}</span>
    <span v-else class="pl-2">{{ t('open_stylebot') }}</span>
  </b-list-group-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { toggleStylebot, isRestrictedUrl } from '../utils';
import InspectorIcon from './InspectorIcon.vue';

export default defineComponent({
  name: 'ToggleStylebot',

  components: {
    InspectorIcon,
  },

  props: {
    tab: {
      type: Object,
      required: true,
    },

    isOpen: Boolean,
  },

  computed: {
    restricted(): boolean {
      return isRestrictedUrl(this.tab?.url);
    },
  },

  methods: {
    toggle(): void {
      toggleStylebot(this.tab);
    },
  },
});
</script>

<style lang="scss">
.open-stylebot {
  svg {
    height: 18px;
    width: 18px;

    path {
      fill: #495057;
    }
  }

  &.restricted {
    opacity: 0.5;
    cursor: default;
  }
}

.restricted-text {
  color: #6c7086;
  font-style: italic;
}
</style>
