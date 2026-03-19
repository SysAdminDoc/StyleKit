<template>
  <b-row class="my-3" align-v="center">
    <b-col sm="7">
      <label :for="id" class="mb-0">
        {{ label }}
      </label>
    </b-col>

    <b-col sm="5">
      <b-form-input
        :id="id"
        :model-value="value"
        class="shortcut"
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Shortcut',

  props: {
    id: {
      type: String,
      required: true,
    },

    label: {
      type: String,
      required: true,
    },
  },

  computed: {
    value(): string {
      return this.$store.state.commands[this.id];
    },
  },
});
</script>

<style lang="scss" scoped>
.shortcut {
  font-family: SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono,
    Courier New, monospace;
  font-size: 14px;
}
</style>
