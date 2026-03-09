<template>
  <code-editor-iframe-shared :height-offset="10" />
</template>

<script lang="ts">
import Vue from 'vue';
import CodeEditorIframeShared from '../../../shared/components/CodeEditorIframe.vue';

export default Vue.extend({
  name: 'CodeEditorIframe',
  components: { CodeEditorIframeShared },
});
</script>
