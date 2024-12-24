<template>
  <div class="file-details">
    <div class="details-header">
      <h3>文件详情</h3>
      <button class="close-btn" @click="closeDetails">×</button>
    </div>
    <!-- 文件详情内容 -->
    <div class="details-content">
      <!-- 您原有的文件详情内容 -->
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const closeDetails = () => {
  router.push('/');
};
</script>

<style scoped>
.file-details {
  padding: 20px;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eaecef;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  
  &:hover {
    background: #f5f6f7;
    color: #333;
  }
}

.details-content {
  /* 您原有的样式 */
}
</style>
