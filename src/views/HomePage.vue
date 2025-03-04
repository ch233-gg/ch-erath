<template>
  <div class="map-container" :class="{ 'split-mode': showBookViewer }">
    <!-- 地图容器 -->
    <MapVisualization v-if="showMap" 
      :activeLayers="activeLayers"
      @toggle-layer="toggleLayer"
      @add-layer="addLayer"
      @remove-layer="removeLayer"
      @clear-all-layers="clearAllLayers"
      @change-basemap="changeBasemap"
      :currentBasemap="currentBasemap"
      ref="mapRef"
      @book-viewer-change="handleBookViewerChange"
    />

    <!-- 右侧控制面板 -->
    <div class="control-panel" :class="{ 'control-panel-with-viewer': showBookViewer }">
      <h3>功能控制</h3>
      <div class="control-buttons">
        <div class="control-btn" @click="toggleFileUpload">
          <span class="btn-icon">📤</span>
          <span class="btn-text">文件上传</span>
        </div>
        <div class="control-btn" @click="toggleFilePagination">
          <span class="btn-icon">📋</span>
          <span class="btn-text">文件列表</span>
        </div>
        <div class="control-btn" @click="toggleMeasurePanel">
          <span class="btn-icon">📏</span>
          <span class="btn-text">测量</span>
          <!-- 测量工具面板 -->
          <div class="measure-panel" v-show="showMeasurePanel">
            <div class="measure-btn" @click.stop="handleMeasure('reset')">
              <span class="measure-icon">🌍</span>
              <span>重置视图</span>
            </div>
            <div class="measure-btn" @click.stop="handleMeasure('distance')">
              <span class="measure-icon">📏</span>
              <span>测距</span>
            </div>
            <div class="measure-btn" @click.stop="handleMeasure('area')">
              <span class="measure-icon">⬢</span>
              <span>测面</span>
            </div>
            <div class="measure-btn" @click.stop="handleMeasure('clear')">
              <span class="measure-icon">🗑️</span>
              <span>清除</span>
            </div>
          </div>
        </div>
        <div class="control-btn" @click="toggleMapDataPanel">
          <span class="btn-icon">📊</span>
          <span class="btn-text">底图数据</span>
        </div>
      </div>

      <!-- 显示的组件 -->
      <div class="panel-content" v-if="showAnyComponent">
        <FileUpload v-if="showFileUpload" />
        <FilePagination v-if="showFilePagination" />
      </div>
    </div>
    
    <!-- 专题底图数据面板 -->
    <div id="controls" 
      v-show="showMapDataPanel" 
      :class="{ 
        'controls-visible': showMapDataPanel,
        'controls-with-viewer': showBookViewer 
      }"
    >
      <h3>专题底图数据</h3>
      <!-- 添加清除按钮 -->
      <div class="clear-button-container">
        <button class="clear-button" @click="clearAllLayers" :disabled="!activeLayers.length">
          <span class="clear-icon">🗑️</span>
          <span>清除所有图层</span>
        </button>
      </div>
      <!-- 底图选择下拉框 -->
      <div class="basemap-selector">
        <div class="selector-header" @click="toggleBasemapList">
          <span>底图选择</span>
          <span class="arrow">{{ showBasemapList ? '▼' : '▶' }}</span>
        </div>
        <div class="basemap-list" v-show="showBasemapList">
          <div 
            v-for="map in basemaps" 
            :key="map.id"
            class="basemap-item"
            :class="{ active: currentBasemap === map.id }"
            @click="changeBasemap(map.id)"
          >
            {{ map.name }}
          </div>
        </div>
      </div>
      <!-- 专题图层列表 -->
      <ul>
        <li v-for="(group, index) in layerGroups" :key="index">
          <div @click="toggleGroup(index)" class="group-title">
            <strong>{{ group.title }}</strong>
            <span>{{ group.expanded ? "-" : "+" }}</span>
          </div>
          <ul v-show="group.expanded" class="layer-list">
            <li v-for="layer in group.layers" :key="layer.name">
              <input
                type="checkbox"
                :value="layer.name"
                v-model="activeLayers"
                @change="handleLayerChange(layer)"
              />
              <label>{{ layer.name }}</label>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import FileUpload from '@/components/FileUpload.vue';
import FilePagination from '@/components/FilePagination.vue';
import MapVisualization from '@/components/MapVisualization.vue';

// 定义图层接口
interface Layer {
  name: string;
  url: string;
  type: string;
  layerName?: string;
}

// 定义底图接口
interface Basemap {
  id: string;
  name: string;
  style: string;
}

// 定义图层组接口
interface LayerGroup {
  title: string;
  expanded: boolean;
  layers: Layer[];
}

// 定义组件的 props 和 emits
const props = withDefaults(defineProps<{
  activeLayers?: string[];
  currentBasemap?: string;
}>(), {
  activeLayers: () => [],
  currentBasemap: 'streets'
});

const emit = defineEmits<{
  (e: 'toggle-layer', layer: Layer): void;
  (e: 'add-layer', layer: Layer): void;
  (e: 'remove-layer', layerName: string): void;
  (e: 'clear-all-layers'): void;
  (e: 'change-basemap', mapId: string): void;
}>();

const showFileUpload = ref(false);
const showFilePagination = ref(false);
const showMap = ref(true);
const showMapDataPanel = ref(false);
const showBookViewer = ref(false);
const mapRef = ref<InstanceType<typeof MapVisualization> | null>(null);

// 添加底图相关状态
const showBasemapList = ref(false);
const currentBasemap = ref('streets');
const activeLayers = ref<string[]>([]);

// 图层分组配置
const layerGroups = ref<LayerGroup[]>([
  {
    title: "专题地图数据",
    expanded: false,
    layers: [
      {
        name: "亚洲陆地",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:Asian land",
      },
      {
        name: "亚洲海洋",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:AsianOceanpolygon",
      },
      {
        name: "三角洲",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:Asiandelta",
      },
      {
        name: "亚洲气候与地貌",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:AsianClimateAndLandforms",
      },
      {
        name: "亚洲气候水文",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:AsianClimateWater",
      },
      {
        name: "亚洲气候线",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:AsianClimateLine",
      },
      {
        name: "亚洲气候多边形",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:AsianClimatePolygon",
      },
      {
        name: "主板块",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:MainPlates",
      },
      {
        name: "亚板块",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:SubPlates",
      },
      {
        name: "全球活动构造板块及其边界带数据集(2022年)",
        url: "http://172.21.252.158:8181/geoserver/geoData/wms?service=WMS&version=1.1.0&request=GetMap&layers=geoData%3Aplates&bbox=-181.8000030517578%2C-90.89899444580078%2C181.8000030517578%2C90.89999389648438&width=768&height=383&srs=EPSG%3A4326&styles=&format=image%2Fpng",
        type: "WMS",
      },
      {
        name: "全球板块边界及其类型数据集(2022年)",
        url: "http://172.21.252.158:8181/geoserver/geoData/wms?service=WMS&version=1.1.0&request=GetMap&layers=geoData%3Aboundaries&bbox=-179.99900817871094%2C-65.93688201904297%2C180.0%2C87.02627563476562&width=768&height=330&srs=EPSG%3A4326&styles=&format=image%2Fpng",
        type: "WMS",
      },
      {
        name: "全球海洋大陆地壳边界数据集(2022年)",
        url: "http://172.21.252.158:8181/geoserver/geoData/wms?service=WMS&version=1.1.0&request=GetMap&layers=geoData%3Aoc_boundaries&bbox=-181.8000030517578%2C-77.21341705322266%2C181.8000030517578%2C90.40480041503906&width=768&height=354&srs=EPSG%3A4326&styles=&format=image%2Fpng",
        type: "WMS",
      },
      {
        name: "全球地质区域及其类型和最后一次造山事件数据集(2022年)",
        url: "http://172.21.252.158:8181/geoserver/geoData/wms?service=WMS&version=1.1.0&request=GetMap&layers=geoData%3Aglobal_gprv&bbox=-181.8000030517578%2C-90.89899444580078%2C181.8000030517578%2C90.89999389648438&width=768&height=383&srs=EPSG%3A4326&styles=&format=image%2Fpng",
        type: "WMS",
      },
    ],
  },
]);

// 底图配置
const basemaps = [
  { id: 'streets', name: '街道地图', style: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'satellite', name: '卫星影像', style: 'mapbox://styles/mapbox/satellite-v9' },
  { id: 'light', name: '浅色底图', style: 'mapbox://styles/mapbox/light-v11' },
  { id: 'dark', name: '深色底图', style: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'outdoors', name: '地形图', style: 'mapbox://styles/mapbox/outdoors-v12' }
];

// 计算是否显示任何组件
const showAnyComponent = computed(() => 
  showFileUpload.value || showFilePagination.value
);

// 切换文件上传组件
const toggleFileUpload = () => {
  showFileUpload.value = !showFileUpload.value;
  showFilePagination.value = false;
};

// 切换文件分页展示组件
const toggleFilePagination = () => {
  showFilePagination.value = !showFilePagination.value;
  showFileUpload.value = false;
};

// 切换地图显示
const toggleMap = () => {
  showMap.value = !showMap.value;
};

// 切换专题底图数据面板
const toggleMapDataPanel = () => {
  showMapDataPanel.value = !showMapDataPanel.value;
};

// 切换底图列表显示
const toggleBasemapList = () => {
  showBasemapList.value = !showBasemapList.value;
};

// 切换分组展开/折叠
const toggleGroup = (index: number) => {
  layerGroups.value[index].expanded = !layerGroups.value[index].expanded;
};

// 切换图层显示
const toggleLayer = (layer: Layer) => {
  const isActive = activeLayers.value.includes(layer.name);
  
  if (isActive) {
    // 如果图层已激活，则移除
    const index = activeLayers.value.indexOf(layer.name);
    if (index !== -1) {
      activeLayers.value.splice(index, 1);
    }
    removeLayer(layer.name);
  } else {
    // 如果图层未激活，则添加
    activeLayers.value.push(layer.name);
    addLayer(layer);
  }
};

// 添加图层
const addLayer = (layer: Layer) => {
  if (mapRef.value) {
    mapRef.value.addLayer(layer);
  }
};

// 移除图层
const removeLayer = (layerName: string) => {
  if (mapRef.value) {
    mapRef.value.removeLayer(layerName);
  }
};

// 清除所有图层
const clearAllLayers = () => {
  activeLayers.value = [];
  if (mapRef.value) {
    mapRef.value.clearAllLayers();
  }
};

// 切换底图
const changeBasemap = (mapId: string) => {
  currentBasemap.value = mapId;
  if (mapRef.value) {
    mapRef.value.changeBasemap(mapId);
  }
  showBasemapList.value = false;
};

// 添加处理图层变化的方法
const handleLayerChange = (layer: Layer) => {
  if (activeLayers.value.includes(layer.name)) {
    addLayer(layer);
  } else {
    removeLayer(layer.name);
  }
};

// 处理书籍查看器状态变化
const handleBookViewerChange = (isVisible: boolean) => {
  showBookViewer.value = isVisible;
};

// 添加测量面板相关状态
const showMeasurePanel = ref(false);

// 切换测量面板显示
const toggleMeasurePanel = () => {
  showMeasurePanel.value = !showMeasurePanel.value;
};

// 处理测量工具操作
const handleMeasure = (action: string) => {
  if (!mapRef.value) return;
  
  switch (action) {
    case 'reset':
      mapRef.value.resetView();
      break;
    case 'distance':
      mapRef.value.toggleMeasurement('distance');
      break;
    case 'area':
      mapRef.value.toggleMeasurement('area');
      break;
    case 'clear':
      mapRef.value.clearMeasurements();
      break;
  }
  showMeasurePanel.value = false;
};

// 添加点击外部关闭测量面板
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.control-btn')) {
    showMeasurePanel.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.map-container {
  position: relative;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif;
}

/* 分屏模式下的容器样式 */
.map-container.split-mode #controls {
  right: 42%; /* 确保在分屏时位于地图区域内 */
  width: 280px;
}

.control-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 400px; /* 增加宽度以适应横向按钮 */
  background: rgba(10, 18, 25, 0.85); /* 半透明深色背景 */
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 16px;
  z-index: 1000;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(26, 38, 53, 0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.control-panel h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 700;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(26, 38, 53, 0.8);
  text-align: center;
  position: relative;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #00e5b0 0%, #00a3ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 10px rgba(0, 229, 176, 0.2);
}

.control-panel h3::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 2px;
  background: linear-gradient(90deg, rgba(0, 229, 176, 0.2) 0%, rgba(0, 229, 176, 1) 50%, rgba(0, 229, 176, 0.2) 100%);
  border-radius: 2px;
}

.control-buttons {
  display: flex;
  flex-direction: row;
  gap: 10px;
  margin-bottom: 16px;
  justify-content: space-between;
}

.control-btn {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 4px;
  background: rgba(17, 26, 36, 0.8);
  border: 1px solid rgba(26, 38, 53, 0.8);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 60px;
  overflow: hidden;
}

.control-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(0, 229, 176, 0.05) 0%, rgba(0, 163, 255, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.control-btn:hover {
  background: rgba(26, 38, 53, 0.9);
  border-color: #00e5b0;
  transform: translateY(-3px);
  box-shadow: 0 6px 15px rgba(0, 229, 176, 0.15);
}

.control-btn:hover::before {
  opacity: 1;
}

.btn-icon {
  font-size: 22px;
  margin-bottom: 6px;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  transition: transform 0.3s ease;
}

.control-btn:hover .btn-icon {
  transform: scale(1.1);
}

.btn-text {
  font-size: 13px;
  color: #ffffff;
  white-space: nowrap;
  font-weight: 500;
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.control-btn:hover .btn-text {
  color: #00e5b0;
}

.panel-content {
  margin-top: 16px;
  padding: 16px;
  background: rgba(17, 26, 36, 0.8);
  border-radius: 10px;
  border: 1px solid rgba(26, 38, 53, 0.8);
  max-height: calc(100vh - 180px);
  overflow-y: auto;
  width: 100%;
  color: #ffffff;
  box-shadow: inset 0 1px 5px rgba(0, 0, 0, 0.1);
}

/* 自定义滚动条样式 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: rgba(10, 18, 25, 0.5);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 229, 176, 0.3);
}

/* 专题底图数据面板样式 */
#controls {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 300px;
  background: rgba(10, 18, 25, 0.85);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05);
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(26, 38, 53, 0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  opacity: 0;
  visibility: hidden;
  transform: translateX(100px);
  z-index: 1001;
  color: #ffffff;
}

#controls.controls-visible {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
}

/* 分屏模式下的专题底图数据面板样式 */
.split-mode #controls.controls-visible {
  right: 42%;
  width: 280px;
  top: 80px;
}

#controls h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 700;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(26, 38, 53, 0.8);
  text-align: center;
  position: relative;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #00e5b0 0%, #00a3ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 10px rgba(0, 229, 176, 0.2);
}

#controls h3::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 2px;
  background: linear-gradient(90deg, rgba(0, 229, 176, 0.2) 0%, rgba(0, 229, 176, 1) 50%, rgba(0, 229, 176, 0.2) 100%);
  border-radius: 2px;
}

#controls .group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 12px 16px;
  background: rgba(17, 26, 36, 0.8);
  border: 1px solid rgba(26, 38, 53, 0.8);
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  margin-bottom: 10px;
  position: relative;
  overflow: hidden;
}

#controls .group-title::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(0, 229, 176, 0.05) 0%, rgba(0, 163, 255, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

#controls .group-title:hover {
  background: rgba(26, 38, 53, 0.9);
  border-color: #00e5b0;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 229, 176, 0.15);
}

#controls .group-title:hover::before {
  opacity: 1;
}

#controls .group-title strong {
  font-size: 14px;
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

#controls .group-title:hover strong {
  color: #00e5b0;
}

#controls .group-title span {
  color: #a0aec0;
  font-size: 16px;
  font-weight: bold;
  position: relative;
  z-index: 1;
}

#controls .layer-list {
  padding: 12px 16px 12px 24px;
  background: rgba(10, 18, 25, 0.6);
  border-radius: 10px;
  margin: 4px 0 16px;
  border: 1px solid rgba(26, 38, 53, 0.8);
  box-shadow: inset 0 1px 5px rgba(0, 0, 0, 0.1);
}

#controls .layer-list li {
  display: flex;
  align-items: center;
  padding: 8px 0;
  transition: all 0.2s ease;
  border-radius: 6px;
  margin-bottom: 4px;
}

#controls .layer-list li:hover {
  background: rgba(17, 26, 36, 0.8);
  padding-left: 8px;
  padding-right: 8px;
}

#controls input[type="checkbox"] {
  margin-right: 10px;
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: #00e5b0;
}

#controls label {
  cursor: pointer;
  font-size: 13px;
  color: #a0aec0;
  font-weight: 500;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;
}

#controls label:hover {
  color: #ffffff;
}

/* 清除按钮容器样式 */
.clear-button-container {
  margin-bottom: 20px;
  padding: 0 4px;
}

.clear-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  background: rgba(17, 26, 36, 0.8);
  border: 1px solid rgba(26, 38, 53, 0.8);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  color: #a0aec0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
}

.clear-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.clear-button:hover:not(:disabled) {
  background: rgba(26, 38, 53, 0.9);
  border-color: #ef4444;
  color: #ef4444;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(239, 68, 68, 0.15);
}

.clear-button:hover:not(:disabled)::before {
  opacity: 1;
}

.clear-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-icon {
  margin-right: 10px;
  font-size: 16px;
  position: relative;
  z-index: 1;
}

/* 底图选择器样式 */
.basemap-selector {
  margin-bottom: 20px;
  border: 1px solid rgba(26, 38, 53, 0.8);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: rgba(17, 26, 36, 0.8);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
}

.selector-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(0, 229, 176, 0.05) 0%, rgba(0, 163, 255, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.selector-header:hover {
  background: rgba(26, 38, 53, 0.9);
  color: #00e5b0;
}

.selector-header:hover::before {
  opacity: 1;
}

.arrow {
  font-size: 12px;
  color: #a0aec0;
  transition: transform 0.3s ease;
  position: relative;
  z-index: 1;
}

.selector-header:hover .arrow {
  color: #00e5b0;
  transform: translateX(2px);
}

.basemap-list {
  background: rgba(10, 18, 25, 0.6);
  border-top: 1px solid rgba(26, 38, 53, 0.8);
}

.basemap-item {
  padding: 12px 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(26, 38, 53, 0.8);
  color: #a0aec0;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.basemap-item:last-child {
  border-bottom: none;
}

.basemap-item:hover {
  background: rgba(17, 26, 36, 0.8);
  color: #ffffff;
  padding-left: 24px;
}

.basemap-item.active {
  background: rgba(26, 38, 53, 0.9);
  color: #00e5b0;
  font-weight: 600;
  position: relative;
}

.basemap-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 3px;
  background: #00e5b0;
  border-radius: 0 2px 2px 0;
}

/* 当书籍查看器显示时，控制面板的样式 */
.control-panel-with-viewer {
  width: 350px !important; /* 调整宽度以适应横向按钮 */
  left: 20px;
}

#controls.controls-visible.with-viewer {
  width: 250px;
  right: calc(40% + 20px) !important;
}

/* 测量工具面板样式 */
.measure-panel {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 140px;
  background: rgba(17, 26, 36, 0.95);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 10px;
  margin-top: 10px;
  z-index: 1002;
  border: 1px solid rgba(26, 38, 53, 0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -10px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.measure-panel::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 0 6px 6px 6px;
  border-style: solid;
  border-color: transparent transparent rgba(17, 26, 36, 0.95) transparent;
  filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.1));
}

.measure-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  color: #a0aec0;
  font-weight: 500;
  letter-spacing: 0.3px;
  position: relative;
  overflow: hidden;
}

.measure-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(0, 229, 176, 0.05) 0%, rgba(0, 163, 255, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.measure-btn:hover {
  background: rgba(26, 38, 53, 0.9);
  color: #00e5b0;
  transform: translateX(2px);
}

.measure-btn:hover::before {
  opacity: 1;
}

.measure-icon {
  font-size: 16px;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  transition: transform 0.3s ease;
}

.measure-btn:hover .measure-icon {
  transform: scale(1.1);
}
</style>
