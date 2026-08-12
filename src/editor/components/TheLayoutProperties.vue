<template>
  <div>
    <visibility />
    <box-model class="mt-2" />
    <layout-context-overlay />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BoxModel from './layout/BoxModel.vue';
import Visibility from './layout/Visibility.vue';
import LayoutContextOverlay from './layout/LayoutContextOverlay.vue';

export default defineComponent({
  name: 'TheLayoutProperties',

  components: {
    BoxModel,
    Visibility,
    LayoutContextOverlay,
  },
});
</script>
