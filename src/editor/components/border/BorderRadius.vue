<template>
  <b-row align-content="center" no-gutters>
    <css-property>{{ t('border_radius') }}</css-property>

    <css-property-value>
      <length property="border-radius" :sizes="sizes" />
    </css-property-value>
  </b-row>
</template>

<script lang="ts">
import Vue from 'vue';

import Length from '../Length.vue';
import CssProperty from '../CssProperty.vue';
import CssPropertyValue from '../CssPropertyValue.vue';

export default Vue.extend({
  name: 'BorderRadius',

  components: {
    Length,
    CssProperty,
    CssPropertyValue,
  },

  data(): {
    sizes: Array<string>;
  } {
    return {
      sizes: ['0', '2', '4', '6', '8', '10', '15', '20', '50'],
    };
  },
});
</script>
