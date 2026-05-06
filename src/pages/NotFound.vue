<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<template>
  <div class="nf">
    <h1>404</h1>
    <p>这条路径不存在或题目已被移除。</p>
    <button class="btn btn-primary" @click="router.push('/')">回到首页</button>
  </div>
</template>

<style scoped>
.nf {
  text-align: center;
  padding: 80px 20px;
}
h1 {
  font-size: 72px;
  font-weight: 800;
  background: linear-gradient(90deg, var(--c-primary), #6366f1);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
p {
  margin: 12px 0 18px;
  color: var(--c-text-soft);
}
</style>
