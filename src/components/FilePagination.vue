<template>
  <div class="file-management">
    <el-input v-model="property" placeholder="请输入章节属性" style="margin-bottom: 10px;" @keyup.enter="fetchFiles" />
    <el-table :data="files" border style="margin-top: 10px;">
      <el-table-column prop="property" label="章节" width="150"></el-table-column>
      <el-table-column prop="file_type" label="文件类型" width="120"></el-table-column>
      <el-table-column prop="file_path" label="文件路径"></el-table-column>
      <el-table-column label="操作" width="250">
        <template #default="scope">
          <el-button size="mini" @click="showDetails(scope.row.id)">详情</el-button>
          <el-button size="mini" type="primary" @click="editFile(scope.row)">编辑</el-button>
          <el-button size="mini" type="danger" @click="deleteFile(scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-model:current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      style="margin-top: 10px;"
      @current-change="fetchFiles">
    </el-pagination>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
  setup() {
    const files = ref([]); // 文件列表
    const property = ref(''); // 查询的章节属性
    const currentPage = ref(1); // 当前页码
    const pageSize = ref(10); // 每页显示条数
    const total = ref(0); // 总记录数
    const router = useRouter();

    // 获取文件列表
    const fetchFiles = async () => {
      try {
        const response = await fetch(
          `http://localhost:8080/api/files/${property.value}?page=${currentPage.value}&size=${pageSize.value}`
        );
        const data = await response.json();
        files.value = data.content.concat(data.images); // 合并文章和图片
        total.value = data.totalRecords; // 设置总记录数
      } catch (error) {
        console.error('获取文件列表失败', error);
      }
    };

    // 删除文件
    const deleteFile = async (fileId: number) => {
      try {
        const response = await fetch(`http://localhost:8080/api/files/${fileId}`, { method: 'DELETE' });
        if (response.ok) {
          alert('文件删除成功');
          fetchFiles(); // 刷新文件列表
        } else {
          const data = await response.json();
          alert(data.message || '删除失败');
        }
      } catch (error) {
        alert('删除文件时发生错误');
      }
    };

    // 跳转到详情页面
const showDetails = (fileId: number) => {
  router.push({
    name: 'fileDetails',
    params: { id: fileId }
  });
};

// 跳转到编辑页面
const editFile = (file: any) => {
  if (file.id) {
    console.log('Navigating to FileEdit:', file.id);
    router.push({ name: 'FileEdit', params: { id: String(file.id) } }); // 路由名称和参数名称必须匹配
  } else {
    console.error('无效的文件ID');
  }
};

    onMounted(fetchFiles);

    return {
      files,
      property,
      currentPage,
      pageSize,
      total,
      fetchFiles,
      deleteFile,
      showDetails,
      editFile,
    };
  },
});
</script>

<style scoped>
.file-management {
  padding: 20px;
  padding-top: 40px;
}
</style>
