<template>
  <b-row align-content="center" no-gutters>
    <css-property>{{ t('border_width') }}</css-property>

    <css-property-value>
      <length property="border-width" :sizes="sizes" />
    </css-property-value>
  </b-row>
</template>

<script lang="ts">
import Vue from 'vue';

import Length from '../Length.vue';
import CssProperty from '../CssProperty.vue';
import CssPropertyValue from '../CssPropertyValue.vue';

export default Vue.extend({
  name: 'BorderWidth',

  components: {
    Length,
    CssProperty,
    CssPropertyValue,
  },

  data(): {
    sizes: Array<string>;
  } {
    return {
      sizes: ['0', '1', '2', '3', '4', '5', '8', '10'],
    };
  },
});
</script>
