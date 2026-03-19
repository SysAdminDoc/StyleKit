<template>
  <div
    class="box"
    @mouseenter="$emit('mouseenter')"
    @mouseleave="$emit('mouseleave')"
  >
    <span class="box-label">{{ label }}</span>

    <box-model-length
      class="box-top"
      :disabled="disabled"
      :property="properties.top"
      @input="$emit('input')"
    />

    <box-model-length
      class="box-right"
      :disabled="disabled"
      :property="properties.right"
      @input="$emit('input')"
    />

    <box-model-length
      class="box-bottom"
      :disabled="disabled"
      :property="properties.bottom"
      @input="$emit('input')"
    />

    <box-model-length
      class="box-left"
      :disabled="disabled"
      :property="properties.left"
      @input="$emit('input')"
    />

    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BoxModelLength from './BoxModelLength.vue';

export default defineComponent({
  name: 'Box',

  components: {
    BoxModelLength,
  },

  props: {
    properties: {
      type: Object,
      required: true,
    },

    label: {
      type: String,
      required: true,
    },

    disabled: {
      type: Boolean,
    },
  },
});
</script>

<style lang="scss" scoped>
.box {
  width: 100%;
  padding: 24px 32px;
  position: relative;
}

.box-label {
  font-size: 10px;
  position: absolute;
  top: 3px;
  left: 7px;
  color: #585b70;
  font-weight: 500;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.box-top {
  top: 3px;
  position: absolute;
  left: calc(100% / 2 - 18px);
}
.box-right {
  right: 0;
  position: absolute;
  top: calc(50% - 9px);
}
.box-left {
  left: 0;
  position: absolute;
  top: calc(50% - 9px);
}
.box-bottom {
  bottom: 3px;
  position: absolute;
  left: calc(100% / 2 - 18px);
}
</style>
