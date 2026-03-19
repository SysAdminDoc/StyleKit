<template>
  <app-button variant="danger" @click="$emit('click')">
    {{ t('open_delete_all_styles_dialog') }}
  </app-button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import AppButton from '../AppButton.vue';

export default defineComponent({
  name: 'TheDeleteAllStylesButton',

  components: {
    AppButton,
  },
});
</script>
