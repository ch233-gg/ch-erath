<template>
  <div class="map-container">
    <!-- 添加分屏容器 -->
    <div class="split-container" :class="{ 'split-active': showBookViewer }">
      <!-- 左侧地图区域 -->
      <div class="map-section" :class="{ 'map-shrink': showBookViewer }">
        <div id="map" ref="mapContainer">
          <!-- 添加 AI 对话框 -->
          <AIChatBox 
            v-if="map"
            :map="map"
            @toggleLayers="handleToggleLayers"
          />
        </div>
      </div>

      <!-- 右侧书籍查看器 -->
      <div class="book-viewer" :class="{ 'viewer-show': showBookViewer }">
        <div class="viewer-header">
          <h3>{{ currentBook.title || '板块信息' }}</h3>
          <button class="close-viewer" @click="closeBookViewer">
            <span class="close-icon">×</span>
          </button>
        </div>
        
        <div class="viewer-content">
          <!-- 切换按钮组 -->
          <div class="content-tabs">
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'info' }"
              @click="activeTab = 'info'"
            >
              <span class="tab-icon">📖</span>
              <span>书籍信息</span>
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'text' }"
              @click="activeTab = 'text'"
            >
              <span class="tab-icon">📝</span>
              <span>文字内容</span>
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'image' }"
              @click="activeTab = 'image'"
            >
              <span class="tab-icon">🖼️</span>
              <span>图片展示</span>
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'table' }"
              @click="activeTab = 'table'"
            >
              <span class="tab-icon">📊</span>
              <span>表格展示</span>
            </button>
          </div>
          
          <!-- 内容显示区域 -->
          <div class="content-display">
            <div v-if="activeTab === 'info'" class="content-section">
              <div class="content-placeholder">
                <h3>{{ currentBook.title }}</h3>
                <p>这里将显示关于 {{ currentBook.title }} 的详细信息。</p>
                <div class="placeholder-content">
                  <p>板块基本信息</p>
                  <ul>
                    <li>位置：亚洲地区</li>
                    <li>面积：约 XXX 平方公里</li>
                    <li>形成时期：XXX</li>
                  </ul>
                </div>
              </div>
            </div>
            <div v-if="activeTab === 'text'" class="content-section">
              <div class="content-placeholder">
                <h3>文字描述</h3>
                <p>这里将显示关于 {{ currentBook.title }} 的详细文字描述。</p>
                <div class="placeholder-content">
                  <p>板块详细信息将在这里展示...</p>
                </div>
              </div>
            </div>
            <div v-if="activeTab === 'image'" class="content-section">
              <div class="content-placeholder">
                <h3>图片展示</h3>
                <p>这里将显示关于 {{ currentBook.title }} 的相关图片。</p>
                <div class="placeholder-content">
                  <div class="image-placeholder">
                    <span class="placeholder-icon">🖼️</span>
                    <p>图片加载区域</p>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="activeTab === 'table'" class="table-display">
              <div class="table-header">
                <h4>数据表格展示</h4>
                <div class="table-actions">
                  <button class="action-btn refresh-btn">
                    <span>🔄</span>
                  </button>
                  <button class="action-btn export-btn">
                    <span>📥</span>
                  </button>
                </div>
              </div>
              <div class="table-content">
                <div class="table-placeholder">
                  <div class="placeholder-icon">📊</div>
                  <p>{{ currentBook.title }} 的数据表格</p>
                  <p class="note">此区域将显示详细数据</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ref, onMounted, nextTick, computed, defineProps, defineEmits } from "vue";
import AIChatBox from './AIChatBox.vue';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';
import FileUpload from './FileUpload.vue';
import FilePagination from './FilePagination.vue';

// 设置 Mapbox token
mapboxgl.accessToken = "pk.eyJ1IjoiY3VkODUiLCJhIjoiY2xrYnFncXZhMGc1cTNlbmFrNHN1N2cxeCJ9.69E3f8nMJkvqQDRhLSojVw";

// 声明 MapboxDraw 模块
declare module '@mapbox/mapbox-gl-draw';

// 定义接口
interface Layer {
  name: string;
  url: string;
  type: string;
  layerName?: string;
}

// 定义 Book 接口
interface Book {
  title: string;
  infoUrl?: string;
  textUrl?: string;
  imageUrl?: string;
  url: string;
}

// 定义props
const props = defineProps<{
  activeLayers: string[];
  currentBasemap: string;
}>();

// 定义emits
const emit = defineEmits<{
  'toggle-layer': [layer: Layer];
  'add-layer': [layer: Layer];
  'remove-layer': [layerName: string];
  'clear-all-layers': [];
  'change-basemap': [mapId: string];
  'book-viewer-change': [isVisible: boolean];
}>();

// Mapbox 相关初始化
const mapContainer = ref<HTMLElement | null>(null);
const map = ref<mapboxgl.Map | null>(null);
const draw = ref<MapboxDraw | null>(null);
const currentTool = ref<string | null>(null);

// 图层分组配置
const layerGroups = ref([
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

// 添加底图相关状态
const showBasemapList = ref(false);
const currentBasemap = ref('streets');

// 底图配置
const basemaps = [
  { id: 'streets', name: '街道地图', style: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'satellite', name: '卫星影像', style: 'mapbox://styles/mapbox/satellite-v9' },
  { id: 'light', name: '浅色底图', style: 'mapbox://styles/mapbox/light-v11' },
  { id: 'dark', name: '深色底图', style: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'outdoors', name: '地形图', style: 'mapbox://styles/mapbox/outdoors-v12' }
];

// 切换底图列表显示
const toggleBasemapList = () => {
  showBasemapList.value = !showBasemapList.value;
};

// 切换底图
const changeBasemap = (mapId: string) => {
  if (!map.value) return;

  const selectedMap = basemaps.find(m => m.id === mapId);
  if (selectedMap) {
    map.value.setStyle(selectedMap.style);
    currentBasemap.value = mapId;
  }
  showBasemapList.value = false;
  emit('change-basemap', mapId);
};

// 切换分组展开/折叠
const toggleGroup = (index: number) => {
  layerGroups.value[index].expanded = !layerGroups.value[index].expanded;
};

// 切换图层的显示/隐藏
const toggleLayer = (layer: Layer) => {
  const isActive = props.activeLayers.includes(layer.name);
  if (isActive) {
    removeLayer(layer.name);
  } else {
    addLayer(layer);
  }
  emit('toggle-layer', layer);
};

// 添加图层到地图
const addLayer = (layer: Layer) => {
  if (!map.value) return;

  if (layer.type === "WFS") {
    // WFS 图层
    const wfsUrl = `${layer.url}?service=WFS&version=1.0.0&request=GetFeature&typeName=${layer.layerName}&maxFeatures=50&outputFormat=application/json`;

    fetch(wfsUrl)
      .then((response) => response.json())
      .then((data) => {
        if (!map.value) return;
        // 如果图层已经存在，则不重复添加
        if (map.value.getSource(layer.name)) return;

        // 添加 GeoJSON 数据源
        map.value.addSource(layer.name, {
          type: "geojson",
          data: data,
        });

        // 添加图层
        map.value.addLayer({
          id: layer.name,
          type: "fill",
          source: layer.name,
          paint: {
            "fill-color": getRandomColor(),
            "fill-opacity": 0.5,
          },
        });
        
        // 如果是主板块图层，添加点击事件监听器
        if (layer.name === "主板块") {
          map.value.on('click', '主板块', showBookInfo);
        }
      })
      .catch((error) => {
        console.error("Error loading WFS layer:", error);
        alert("加载图层失败：" + layer.name);
      });
  } else if (layer.type === "WMS") {
    // WMS 图层
    map.value.addLayer({
      id: layer.name,
      type: "raster",
      source: {
        type: "raster",
        tiles: [layer.url],
        tileSize: 256,
      },
      paint: {
        "raster-opacity": 0.7,
      },
    });
  }
  emit('add-layer', layer);
};

// 移除图层
const removeLayer = (layerName: string) => {
  if (!map.value) return;

  if (map.value.getLayer(layerName)) {
    map.value.removeLayer(layerName);
  }
  if (map.value.getSource(layerName)) {
    map.value.removeSource(layerName);
  }
  emit('remove-layer', layerName);
};

// 随机生成图层颜色
const getRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// 清除所有图层
const clearAllLayers = () => {
  props.activeLayers.forEach(layerName => {
    removeLayer(layerName);
  });
  emit('clear-all-layers');
};

// 切换地图显示
const toggleMap = () => {
  showMap.value = !showMap.value;
};

// 添加活动标签状态
const activeTab = ref('info');  // 默认显示书籍信息

// 添加 resetView 方法
const resetView = () => {
  if (!map.value) return;
  map.value.flyTo({
    center: [118.7915619, 32.0615513],
    zoom: 3,
    bearing: 0,
    pitch: 0
  });
};

// 添加 handleToggleLayers 方法
const handleToggleLayers = (layers: string[]) => {
  layers.forEach(layerName => {
    const layer = layerGroups.value[0].layers.find(l => l.name === layerName);
    if (layer) {
      if (props.activeLayers.includes(layerName)) {
        removeLayer(layerName);
      } else {
        addLayer(layer);
      }
    }
  });
};

// 添加测量相关方法
const toggleMeasurement = (type: string) => {
  if (!draw.value) return;

  if (currentTool.value === type) {
    currentTool.value = null;
    draw.value.deleteAll();
    draw.value.changeMode('simple_select');
  } else {
    currentTool.value = type;
    draw.value.deleteAll();
    if (type === 'area') {
      draw.value.changeMode('draw_polygon');
    } else if (type === 'distance') {
      draw.value.changeMode('draw_line_string');
    }
  }
};

// 更新测量结果显示方法
const updateMeasurement = (e: { features: any[] }) => {
  if (!e.features.length || !map.value) return;
  
  const data = e.features[0];
  if (data.geometry.type === 'Polygon' && currentTool.value === 'area') {
    const area = turf.area(data);
    const areaKm = (area / 1000000).toFixed(2);
    
    new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'measurement-result'
    })
      .setLngLat(data.geometry.coordinates[0][0])
      .setHTML(`<div class="measurement-value">面积: ${areaKm} 平方公里</div>`)
      .addTo(map.value);

  } else if (data.geometry.type === 'LineString' && currentTool.value === 'distance') {
    const length = turf.length(data, { units: 'kilometers' }).toFixed(2);
    const coordinates = data.geometry.coordinates;
    
    new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'measurement-result'
    })
      .setLngLat(coordinates[coordinates.length - 1])
      .setHTML(`<div class="measurement-value">距离: ${length} 公里</div>`)
      .addTo(map.value);
  }
};

// 清除测量
const clearMeasurements = () => {
  if (!draw.value) return;

  draw.value.deleteAll();
  currentTool.value = null;
  
  // 移除所有测量结果弹窗
  const popups = document.getElementsByClassName('mapboxgl-popup');
  while(popups[0]) {
    popups[0].remove();
  }
};

// 添加分屏相关状态
const showBookViewer = ref(false);
const currentBook = ref<Book>({
  title: '',
  infoUrl: '',
  textUrl: '',
  imageUrl: '',
  url: ''
});

// 关闭书籍查看器
const closeBookViewer = () => {
  showBookViewer.value = false;
  emit('book-viewer-change', false);
  if (map.value) {
    setTimeout(() => {
      map.value?.resize();
    }, 300);
  }
};

// 添加状态控制
const showFileUpload = ref(false);
const showFilePagination = ref(false);
const showMap = ref(true);

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

// 在打开书籍查看器的地方添加事件发送
const showBookInfo = (e: any) => {
  // 确保有features并且至少有一个feature
  if (e.features?.length > 0) {
    const feature = e.features[0];
    const name = feature.properties?.name || '板块信息';
    
    // 设置当前书籍信息，包括所有必要的URL
    currentBook.value = {
      title: name,
      infoUrl: `https://example.com/info/${name}`,
      textUrl: `https://example.com/text/${name}`,
      imageUrl: `https://example.com/image/${name}`,
      url: `https://example.com/book/${name}`
    };
    
    // 显示书籍查看器并发送事件
    showBookViewer.value = true;
    emit('book-viewer-change', true);
    
    // 调整地图大小以适应新的容器尺寸
    setTimeout(() => {
      map.value?.resize();
    }, 300);
  }
};

// 初始化地图
onMounted(() => {
  if (!mapContainer.value) return;

  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [118.7915619, 32.0615513],
    zoom: 3,
    preserveDrawingBuffer: true
  });

  map.value.on('load', () => {
    if (!map.value) return;
    
    // 初始化绘图工具
    draw.value = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        line_string: true,
        polygon: true,
        trash: true
      }
    });

    map.value.addControl(draw.value);

    // 添加事件监听
    map.value.on('draw.create', updateMeasurement);
    map.value.on('draw.update', updateMeasurement);
    map.value.on('draw.delete', clearMeasurements);

    // 添加地图移动事件监听
    map.value.on('move', () => {
      const measurementDiv = document.getElementById('measurement-result');
      if (measurementDiv && draw.value) {
        const features = draw.value.getAll().features;
        if (features && features.length > 0) {
          const feature = features[0];
          if (feature.geometry.type === 'Polygon') {
            const center = turf.center(feature);
            const coordinates = center.geometry.coordinates as [number, number];
            if (map.value) {
              const point = map.value.project(coordinates);
              measurementDiv.style.left = `${point.x + 10}px`;
              measurementDiv.style.top = `${point.y - 30}px`;
            }
          } else if (feature.geometry.type === 'LineString') {
            const coordinates = feature.geometry.coordinates;
            const endPoint = coordinates[coordinates.length - 1] as [number, number];
            if (map.value) {
              const point = map.value.project(endPoint);
              measurementDiv.style.left = `${point.x + 10}px`;
              measurementDiv.style.top = `${point.y - 30}px`;
            }
          }
        }
      }
    });
  });
});

// 暴露测量相关方法给父组件
defineExpose({
  toggleLayer,
  addLayer,
  removeLayer,
  clearAllLayers,
  changeBasemap,
  resetView,
  toggleMeasurement,
  clearMeasurements
});
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 分屏布局样式 */
.split-container {
  display: flex;
  width: 100%;
  height: 100%;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

/* 左侧地图区域样式 */
.map-section {
  position: relative;
  flex: 1;
  transition: all 0.3s ease;
  width: 100%;
  height: 100vh;
  overflow: visible;
}

.map-section.map-shrink {
  width: 60%;
  flex: 0 0 60%;
}

/* 右侧书籍查看器样式 */
.book-viewer {
  position: absolute;
  right: 0;
  top: 0;
  width: 40%;
  height: 100%;
  background: #ffffff;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
}

.book-viewer.viewer-show {
  transform: translateX(0);
}

.viewer-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-viewer {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  color: #909399;
}

.close-viewer:hover {
  color: #606266;
}

/* 地图控件样式 */
.map-controls-group {
  position: absolute;
  top: 10px;
  right: 120px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.map-control-icon, .reset-view-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666;
  border: 1px solid #e4e7ed;
}

.map-control-icon:hover, .reset-view-icon:hover {
  background: #f5f7fa;
  border-color: #c0c4cc;
  transform: translateY(-1px);
}

.map-control-icon.active {
  background: #409eff;
  border-color: #409eff;
  color: #ffffff;
}

.map-control-icon svg, .reset-view-icon svg {
  width: 20px;
  height: 20px;
}

/* 分屏模式下的位置调整 */
.split-active .map-controls-group {
  right: calc(42% + 120px); /* 在分屏模式下保持相对位置 */
}

/* 地图容器样式调整 */
#map {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 分屏布局样式调整 */
.split-container {
  display: flex;
  width: 100%;
  height: 100%;
  transition: all 0.3s ease;
}

.map-section {
  flex: 1;
  height: 100%;
  position: relative;
  transition: all 0.3s ease;
}

.map-section.map-shrink {
  flex: 0 0 60%;
}

/* 书籍查看器样式调整 */
.book-viewer {
  position: absolute;
  right: 0;
  top: 0;
  width: 40%;
  height: 100%;
  background: #ffffff;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
}

.book-viewer.viewer-show {
  transform: translateX(0);
}

.viewer-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-viewer {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  color: #909399;
}

.close-viewer:hover {
  color: #606266;
}

.viewer-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  height: calc(100% - 60px); /* 减去header的高度 */
  background: #fff;
}

.content-tabs {
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  background: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
  transition: all 0.3s ease;
  font-size: 14px;
}

.tab-btn:hover {
  background: #f5f7fa;
  color: #409eff;
}

.tab-btn.active {
  background: #ecf5ff;
  color: #409eff;
  font-weight: 500;
}

.tab-icon {
  font-size: 16px;
}

.content-display {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #fff;
}

.content-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #f0f0f0;
}

.content-placeholder {
  text-align: center;
  padding: 20px;
}

.content-placeholder h3 {
  margin-bottom: 16px;
  color: #303133;
  font-size: 18px;
}

.content-placeholder p {
  color: #606266;
  margin-bottom: 20px;
  font-size: 14px;
}

.placeholder-content {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 20px;
  text-align: left;
}

.placeholder-content ul {
  list-style: none;
  padding: 0;
  margin: 16px 0 0 0;
}

.placeholder-content li {
  padding: 8px 0;
  color: #606266;
  border-bottom: 1px dashed #e4e7ed;
  font-size: 14px;
}

.placeholder-content li:last-child {
  border-bottom: none;
}

.image-placeholder {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
}

.placeholder-icon {
  font-size: 48px;
  color: #909399;
}

.table-display {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  height: 100%;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.table-header h4 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #606266;
}

.action-btn:hover {
  background: #f5f7fa;
  border-color: #c0c4cc;
  color: #409eff;
}

.table-content {
  min-height: 200px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.table-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #f5f7fa;
  border-radius: 8px;
  gap: 16px;
  height: 100%;
}

.table-placeholder .note {
  color: #909399;
  font-size: 14px;
}
</style>
