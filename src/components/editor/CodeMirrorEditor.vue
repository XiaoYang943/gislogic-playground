<script setup lang="ts">
import CodeMirror, { type Props } from './codemirror/CodeMirror.vue'
import { computed } from 'vue'
import type { EditorEmits, EditorProps } from '../../type/types'

defineOptions({
  editorType: 'codemirror',
})

const props = defineProps<EditorProps>()
const emit = defineEmits<EditorEmits>()

const onChange = (code: string) => {
  emit('change', code)
}

const modes: Record<string, Props['mode']> = {
  css: 'css',
  html: 'htmlmixed',
  js: {
    name: 'javascript',
  },
  json: {
    name: 'javascript',
    json: true,
  },
  ts: {
    name: 'javascript',
    typescript: true,
  },
  vue: 'htmlmixed',
}

const activeMode = computed(() => {
  const { mode: forcedMode, filename } = props
  const mode = modes[forcedMode || filename.split('.').pop()!]
  return filename.lastIndexOf('.') !== -1 && mode ? mode : modes.js
})
</script>

<template>
  // 编辑器部分
  <CodeMirror
    :value="value"
    :mode="activeMode"
    :readonly="readonly"
    @change="onChange"
  />
</template>
