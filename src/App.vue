<template>
  <Repl
    :store="store"
    :theme="theme"
    :preview-theme="previewTheme"
    :editor="editor"
    ssr
    :sfc-options="sfcOptions"
  />
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import Repl from "./components/sandbox/Repl.vue";
import MonacoEditor from './components/editor/MonacoEditor.vue';
// import CodeMirrorEditor from './components/editor/CodeMirrorEditor.vue'
import { useStore } from './store/store'
import { OutputModes } from './type/types'



const query = new URLSearchParams(location.search);
const store = useStore({
  // ... 可以根据需要添加更多选项
  showOutput: ref(query.has('so')),
  outputMode: ref((query.get('om') as OutputModes) || 'preview'),
});

const theme = ref<'light' | 'dark'>('light');
const previewTheme = ref(false);
const editor = MonacoEditor; // 或 CodeMirrorEditor
const sfcOptions = {
  script: {
    // inlineTemplate: false // 如果需要，可以取消注释
  },
};

watchEffect(() => history.replaceState({}, '', store.serialize()));
</script>