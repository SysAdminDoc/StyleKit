<template>
  <div>
    <font-family />
    <font-size class="mt-2" />
    <line-height class="mt-2" />
    <font-style class="mt-2" />
    <text-decoration class="mt-2" />
    <text-transform class="mt-2" />
    <text-align class="mt-2" />
    <letter-spacing class="mt-2" />
    <word-spacing class="mt-2" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import FontSize from './text/FontSize.vue';
import LineHeight from './text/LineHeight.vue';
import FontStyle from './text/FontStyle.vue';
import FontFamily from './text/FontFamily.vue';
import TextDecoration from './text/TextDecoration.vue';
import TextTransform from './text/TextTransform.vue';
import TextAlign from './text/TextAlign.vue';
import LetterSpacing from './text/LetterSpacing.vue';
import WordSpacing from './text/WordSpacing.vue';

export default defineComponent({
  name: 'TheTextProperties',
  components: {
    FontFamily,
    FontSize,
    LineHeight,
    FontStyle,
    TextDecoration,
    TextTransform,
    TextAlign,
    LetterSpacing,
    WordSpacing,
  },
});
</script>
