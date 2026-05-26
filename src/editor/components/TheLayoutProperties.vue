<template>
  <div>
    <visibility />
    <box-model class="mt-2" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BoxModel from './layout/BoxModel.vue';
import Visibility from './layout/Visibility.vue';

export default defineComponent({
  name: 'TheLayoutProperties',

  components: {
    BoxModel,
    Visibility,
  },
});
</script>
