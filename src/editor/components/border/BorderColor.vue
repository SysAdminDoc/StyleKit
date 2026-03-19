<template>
  <b-row class="border-color" align-content="center" no-gutters>
    <css-property>
      {{ t('border_color') }}
    </css-property>

    <css-property-value>
      <color-picker :property="'border-color'" />
    </css-property-value>
  </b-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import CssProperty from '../CssProperty.vue';
import CssPropertyValue from '../CssPropertyValue.vue';
import ColorPicker from '../color/ColorPicker.vue';

export default defineComponent({
  name: 'BorderColor',

  components: {
    ColorPicker,
    CssProperty,
    CssPropertyValue,
  },
});
</script>
