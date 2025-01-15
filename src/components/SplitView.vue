<template>
  <div class="split-container" :class="{ 'is-split': isVisible }">
    <!-- 左侧地图区域 -->
    <div class="map-area" :style="mapStyle">
      <slot name="map"></slot>
    </div>

    <!-- 右侧内容区域 -->
    <div class="content-area" v-show="isVisible">
      <div class="content-header">
        <h3>{{ selectedLayer?.name }}</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      
      <div class="content-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="{ active: currentTab === tab.id }"
          @click="currentTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="content-body">
        <div v-show="currentTab === 'info'" class="tab-panel">
          <!-- 信息面板内容 -->
        </div>
        <div v-show="currentTab === 'data'" class="tab-panel">
          <!-- 数据面板内容 -->
        </div>
        <div v-show="currentTab === 'docs'" class="tab-panel">
          <!-- 文档面板内容 -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  isVisible: Boolean,
  selectedLayer: Object
});

const emit = defineEmits(['close']);

const currentTab = ref('info');

const tabs = [
  { id: 'info', label: '基本信息' },
  { id: 'data', label: '数据预览' },
  { id: 'docs', label: '相关文档' }
];

const mapStyle = computed(() => ({
  width: props.isVisible ? '40%' : '100%'
}));

const close = () => {
  emit('close');
};
</script>

<style scoped>
.split-container {
  width: 100%;
  height: 100vh;
  display: flex;
  position: relative;
}

.map-area {
  height: 100%;
  transition: width 0.3s ease;
}

.content-area {
  width: 60%;
  height: 100%;
  background: white;
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.content-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
}

.content-tabs {
  padding: 12px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.content-tabs button {
  padding: 8px 16px;
  border: none;
  background: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.content-tabs button.active {
  background: #ede9fe;
  color: #4f46e5;
}

.content-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f3f4f6;
}
</style> 