<template>
  <app-button
    class="mr-2"
    size="sm"
    variant="outline-danger"
    @click="$emit('click')"
  >
    {{ t('open_delete_style_dialog') }}
  </app-button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import AppButton from '../AppButton.vue';

export default defineComponent({
  name: 'StyleDeleteButton',

  components: {
    AppButton,
  },

  props: {
    url: {
      type: String,
      required: true,
    },
  },
});
</script>
