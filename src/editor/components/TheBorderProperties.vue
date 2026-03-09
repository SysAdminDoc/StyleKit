<template>
  <div>
    <border-style />
    <border-color class="mt-3" />
    <border-width class="mt-3" />
    <border-radius class="mt-3" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import BorderStyle from './border/BorderStyle.vue';
import BorderColor from './border/BorderColor.vue';
import BorderWidth from './border/BorderWidth.vue';
import BorderRadius from './border/BorderRadius.vue';

export default Vue.extend({
  name: 'TheBorderProperties',

  components: {
    BorderStyle,
    BorderColor,
    BorderWidth,
    BorderRadius,
  },
});
</script>
