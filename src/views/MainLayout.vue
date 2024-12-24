<template>
  <div class="main-layout">
    <!-- 左侧主内容区域 -->
    <div class="main-content">
      <router-view name="default"></router-view>
    </div>
    
    <!-- 右侧文件详情区域 -->
    <div class="details-panel" v-if="$route.name === 'fileDetails'">
      <router-view name="fileDetails"></router-view>
    </div>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  width: 100%;
  height: 100vh;
}

.main-content {
  flex: 1;
  overflow: auto;
}

.details-panel {
  width: 400px;
  height: 100%;
  border-left: 1px solid #eaecef;
  background: #fff;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
  overflow: auto;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
</style> 