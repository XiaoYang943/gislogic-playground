<template>
  <FileSelector />
  <div class="editor-container">
    <props.editorComponent
      :value="store.activeFile.code"
      :filename="store.activeFile.filename"
      @change="onChange"
    />
    <Message v-show="showMessage" :err="store.errors[0]" />
    <MessageToggle v-model="showMessage" />
  </div>
</template>

<script setup lang="ts">
import FileSelector from './FileSelector.vue'
import Message from '../common/Message.vue'
import { debounce } from '../../utils/common/util'
import { inject, ref, watch } from 'vue'
import MessageToggle from './MessageToggle.vue'
import { type EditorComponentType, injectKeyStore } from '../../type/types'

const SHOW_ERROR_KEY = 'repl_show_error'

const props = defineProps<{
  editorComponent: EditorComponentType
}>()

const store = inject(injectKeyStore)!
console.log(store)
const showMessage = ref(getItem())

const onChange = debounce((code: string) => {
  // 更改code 代码 主要为边以前代码
  store.activeFile.code = code
}, 250)

function setItem() {
  localStorage.setItem(SHOW_ERROR_KEY, showMessage.value ? 'true' : 'false')
}

function getItem() {
  const item = localStorage.getItem(SHOW_ERROR_KEY)
  return !(item === 'false')
}

watch(showMessage, () => {
  setItem()
})
</script>



<style scoped>
.editor-container {
  height: calc(100% - var(--header-height));
  overflow: hidden;
  position: relative;
}
</style>
