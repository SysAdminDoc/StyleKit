<template>
  <b-row align-content="center" no-gutters>
    <css-property>{{ t('background_color') }}</css-property>

    <css-property-value>
      <color-picker :property="'background-color'" />
    </css-property-value>
  </b-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import CssProperty from '../CssProperty.vue';
import CssPropertyValue from '../CssPropertyValue.vue';
import ColorPicker from './ColorPicker.vue';

export default defineComponent({
  name: 'BackgroundColor',

  components: {
    ColorPicker,
    CssProperty,
    CssPropertyValue,
  },
});
</script>
