<template>
  <div>
    <border-style />
    <border-color class="mt-2" />
    <border-width class="mt-2" />
    <border-radius class="mt-2" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import BorderStyle from './border/BorderStyle.vue';
import BorderColor from './border/BorderColor.vue';
import BorderWidth from './border/BorderWidth.vue';
import BorderRadius from './border/BorderRadius.vue';

export default defineComponent({
  name: 'TheBorderProperties',

  components: {
    BorderStyle,
    BorderColor,
    BorderWidth,
    BorderRadius,
  },
});
</script>
