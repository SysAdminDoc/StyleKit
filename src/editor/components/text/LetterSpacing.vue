<template>
  <b-row align-content="center" no-gutters>
    <css-property>{{ t('letter_spacing') }}</css-property>

    <css-property-value>
      <length property="letter-spacing" :sizes="sizes" />
    </css-property-value>
  </b-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import Length from '../Length.vue';
import CssProperty from '../CssProperty.vue';
import CssPropertyValue from '../CssPropertyValue.vue';

export default defineComponent({
  name: 'LetterSpacing',

  components: {
    Length,
    CssProperty,
    CssPropertyValue,
  },

  data(): {
    sizes: Array<string>;
  } {
    return {
      sizes: ['-2', '-1', '0', '1', '2', '3', '4', '5', '8', '10'],
    };
  },
});
</script>
