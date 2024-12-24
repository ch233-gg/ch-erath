<template>
  <div class="file-edit">
    <h2>编辑文件</h2>
    <el-form :model="file" label-width="120px" class="file-edit-form">
      <el-form-item label="章节">
        <el-input v-model="file.property" placeholder="请输入章节属性"></el-input>
      </el-form-item>
      <el-form-item label="文件类型">
        <el-select v-model="file.file_type" placeholder="请选择文件类型">
          <el-option label="文章" value="article"></el-option>
          <el-option label="图片" value="image"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="文件路径">
        <el-input v-model="file.file_path" placeholder="请输入文件路径"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="updateFile">保存</el-button>
        <el-button @click="goBack">取消</el-button>
        
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export default defineComponent({
  setup() {
    const file = ref<any>({
      id: null,
      property: '',
      file_type: '',
      file_path: '',
    });

    const route = useRoute();
    const router = useRouter();

    // 获取文件详情
    const fetchFileDetails = async () => {
      const fileId = Number(route.params.id);  // 将字符串转换为数值
      try {
        const response = await fetch(`http://localhost:8080/api/files/details/${fileId}`);
        if (response.ok) {
          file.value = await response.json();
        } else {
          const data = await response.json();
          alert(data.message || '获取文件详情失败');
        }
      } catch (error) {
        console.error('获取文件详情失败', error);
        alert('请求文件详情时发生错误');
      }
    };

    // 更新文件信息
    const updateFile = async (fileId: number) => {
      try {
        const response = await fetch(`http://localhost:8080/api/files/${fileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(file.value),
        });
        if (response.ok) {
          alert('文件更新成功');
          router.push('/'); // 更新成功后返回首页
        } else {
          const data = await response.json();
          alert(data.message || '更新文件失败');
        }
      } catch (error) {
        console.error('更新文件失败', error);
        alert('请求更新文件时发生错误');
      }
    };

    // 返回上一页
    const goBack = () => {
      router.push('/filepagination');
    };

    //返回主界面
    

    onMounted(fetchFileDetails);

    return {
      file,
      updateFile,
      goBack,
    };
  },
});
</script>


<style scoped>
.file-edit {
  padding: 20px;
}

.file-edit-form {
  max-width: 600px;
}
</style>
