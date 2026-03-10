<template>
  <div>
    <color />
    <background-color class="mt-2" />
    <opacity class="mt-2" />
    <box-shadow class="mt-2" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import Color from './color/Color.vue';
import BackgroundColor from './color/BackgroundColor.vue';
import Opacity from './color/Opacity.vue';
import BoxShadow from './color/BoxShadow.vue';

export default Vue.extend({
  name: 'TheColorProperties',

  components: {
    Color,
    BackgroundColor,
    Opacity,
    BoxShadow,
  },
});
</script>
