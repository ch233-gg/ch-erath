import { createRouter, createWebHistory } from 'vue-router';
import MapVisualization from '@/components/MapVisualization.vue';
import FileDetails from '@/components/FileDetails.vue';
import FileEdit from '@/components/FileEdit.vue';
import FilePagination from '@/components/FilePagination.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: MapVisualization,
  },
  {
    path: '/files/details/:id',
    name: 'FileDetails',
    component: FileDetails,
  },
  {
    path: '/files/edit/:id',
    name: 'FileEdit',
    component: FileEdit,
    props: true,
  },
  {
    path: '/filepagination',
    name: 'filepagination',
    component: FilePagination,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
