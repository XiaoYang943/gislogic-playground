<template>
  <h1>{{ msg }}</h1>
  <input v-model="msg" />
  <div>{{moment()}}</div>
</template>

<script setup>
import { ref } from 'vue'
import moment from 'moment'
const msg = ref('Hello World!')
</script>

<style scoped>

</style>


