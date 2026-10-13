<template>
  <router-view />
</template>

<script setup lang="ts">
</script>

<style>
/* reset.scss 此前从未被引入（四周 8px 空白的根因，v1.2 排查实测 body margin=8px）；
   核心重置内联于此，避免再依赖无人引用的样式文件 */
/* box-sizing 必须显式声明：项目里 src/assets/styles/reset.scss 从未被引入，
   默认 content-box 会让 width:100% 的 input/textarea 加上 padding+border 后撑破容器
   （实测表现：AI建题抽屉出现横向滚动条）。 */
*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

#app {
  width: 100%;
  height: 100%;
}
</style>
