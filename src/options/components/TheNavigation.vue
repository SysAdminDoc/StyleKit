<template>
  <div class="navigation">
    <div class="header mb-3">
      StyleKit
      <span class="light ml-1 d-md-inline-flex d-none">
        {{ t(`${currentTab}_options`) }}
      </span>
    </div>

    <b-list-group class="navigation-list">
      <b-list-group-item
        v-for="tab in tabs"
        :key="tab"
        button
        class="navigation-item"
        :active="currentTab === tab"
        @click="$emit('select', tab)"
      >
        {{ t(`${tab}_options`) }}
      </b-list-group-item>
    </b-list-group>

    <the-navigation-footer class="mt-4" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import TheNavigationFooter from './navigation/TheNavigationFooter.vue';

export default defineComponent({
  name: 'TheNavigation',

  components: {
    TheNavigationFooter,
  },

  props: {
    tabs: {
      type: Array,
      required: true,
    },

    currentTab: {
      type: String,
      required: true,
    },
  },
});
</script>

<style lang="scss" scoped>
.header {
  font-size: 34px;

  .light {
    font-weight: 200;
    text-transform: lowercase;
  }
}

.navigation {
  height: 100%;
}

.navigation-list {
  border-radius: 0;
}

.navigation-item {
  border: none;

  &:focus {
    outline: none;
  }

  &:hover:not(.active) {
    background: rgba(255, 255, 255, 0.05);
  }
}
</style>
