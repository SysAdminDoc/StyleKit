<template>
  <app-button variant="danger" @click="$emit('click')">
    {{ t('open_delete_all_styles_dialog') }}
  </app-button>
</template>

<script lang="ts">
import Vue from 'vue';
import AppButton from '../AppButton.vue';

export default Vue.extend({
  name: 'TheDeleteAllStylesButton',

  components: {
    AppButton,
  },
});
</script>
