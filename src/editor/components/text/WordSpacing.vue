<template>
  <b-row align-content="center" no-gutters>
    <css-property>{{ t('word_spacing') }}</css-property>

    <css-property-value>
      <length property="word-spacing" :sizes="sizes" />
    </css-property-value>
  </b-row>
</template>

<script lang="ts">
import Vue from 'vue';

import Length from '../Length.vue';
import CssProperty from '../CssProperty.vue';
import CssPropertyValue from '../CssPropertyValue.vue';

export default Vue.extend({
  name: 'WordSpacing',

  components: {
    Length,
    CssProperty,
    CssPropertyValue,
  },

  data(): {
    sizes: Array<string>;
  } {
    return {
      sizes: ['-2', '0', '2', '4', '6', '8', '10', '15', '20'],
    };
  },
});
</script>
