<script setup lang="ts">
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>();

const groups = [
  {
    title: '导航',
    items: [
      ['j / k', '上一题 / 下一题'],
      ['h / l', '上一类 / 下一类'],
      ['/ 或 ⌘K', '打开搜索面板'],
      ['?', '显示快捷键帮助'],
    ],
  },
  {
    title: '答题',
    items: [
      ['Space', '展开/收起答案'],
      ['m', '标记为已掌握'],
      ['r', '标记为需复习'],
      ['n', '编辑笔记'],
    ],
  },
];

function close() {
  emit('update:open', false);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="overlay" @click.self="close">
      <div class="card panel">
        <header>
          <h3>快捷键</h3>
          <button class="btn-ghost" @click="close">✕</button>
        </header>
        <div v-for="g in groups" :key="g.title" class="group">
          <h4>{{ g.title }}</h4>
          <ul>
            <li v-for="[k, d] in g.items" :key="k as string">
              <kbd>{{ k }}</kbd>
              <span>{{ d }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
}
.panel {
  width: min(92vw, 480px);
  padding: 18px 22px;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.group {
  margin-top: 12px;
}
.group h4 {
  font-size: 13px;
  color: var(--c-text-mute);
  margin-bottom: 6px;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
li {
  display: flex;
  gap: 12px;
  align-items: center;
}
kbd {
  display: inline-block;
  min-width: 56px;
  text-align: center;
  font-family: monospace;
  background: var(--c-bg-mute);
  border: 1px solid var(--c-border);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
}
</style>
