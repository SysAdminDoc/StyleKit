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
import Vue from 'vue';
import AppButton from '../AppButton.vue';

export default Vue.extend({
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
