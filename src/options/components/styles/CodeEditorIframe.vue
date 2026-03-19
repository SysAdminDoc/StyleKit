<template>
  <code-editor-iframe-shared :height-offset="5" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CodeEditorIframeShared from '../../../shared/components/CodeEditorIframe.vue';

export default defineComponent({
  name: 'CodeEditorIframe',
  components: { CodeEditorIframeShared },
});
</script>
