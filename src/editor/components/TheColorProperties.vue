<template>
  <div>
    <color />
    <background-color class="mt-2" />
    <opacity class="mt-2" />
    <box-shadow class="mt-2" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import Color from './color/Color.vue';
import BackgroundColor from './color/BackgroundColor.vue';
import Opacity from './color/Opacity.vue';
import BoxShadow from './color/BoxShadow.vue';

export default defineComponent({
  name: 'TheColorProperties',

  components: {
    Color,
    BackgroundColor,
    Opacity,
    BoxShadow,
  },
});
</script>
