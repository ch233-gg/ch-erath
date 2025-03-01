<template>
  <div class="map-container">
    <!-- 左上角功能控制组件 -->
    <div class="top-controls">
      <div class="control-buttons">
        <div class="control-btn" @click="toggleFileUpload">
          <span class="btn-icon">📤</span>
          <span class="btn-text">文件上传</span>
        </div>
        <div class="control-btn" @click="toggleFilePagination">
          <span class="btn-icon">📋</span>
          <span class="btn-text">文件列表</span>
        </div>
        <div class="control-btn" @click="toggleMap">
          <span class="btn-icon">🗺️</span>
          <span class="btn-text">地图显示</span>
        </div>
      </div>
      
      <!-- 显示的组件 -->
      <div class="panel-content" v-if="showAnyComponent">
        <FileUpload v-if="showFileUpload" />
        <FilePagination v-if="showFilePagination" />
      </div>
    </div>

    <!-- 添加分屏容器 -->
    <div class="split-container" :class="{ 'split-active': showBookViewer }">
      <!-- 左侧地图区域 -->
      <div class="map-section" :class="{ 'map-shrink': showBookViewer }">
        <div id="map" ref="mapContainer">
          <!-- 测量工具栏 - 修改为独立按钮 -->
          <div class="map-controls-group">
            <!-- 重置视图图标 -->
            <div class="reset-view-icon" @click="resetView" title="重置视图">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g class="globe-paths">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 3C12 3 8 7 8 12C8 17 12 21 12 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M12 3C12 3 16 7 16 12C16 17 12 21 12 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M3 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </g>
              </svg>
            </div>
            
            <!-- 测距按钮 -->
            <div 
              class="map-control-icon" 
              :class="{ active: currentTool === 'distance' }"
              @click="toggleMeasurement('distance')" 
              title="测距"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 12H22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M5 8V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M19 8V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M12 7V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            
            <!-- 测面按钮 -->
            <div 
              class="map-control-icon" 
              :class="{ active: currentTool === 'area' }"
              @click="toggleMeasurement('area')" 
              title="测面"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6L12 3L21 6V18L12 21L3 18V6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M12 3V21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M3 6L21 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M21 6L3 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            
            <!-- 清除测量按钮 -->
            <div 
              class="map-control-icon" 
              @click="clearMeasurements" 
              title="清除测量"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
          </div>

          <!-- 图层控制面板 -->
          <div id="controls">
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
                      @change="toggleLayer(layer)"
                    />
                    <label>{{ layer.name }}</label>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
          
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
            <iframe 
              v-if="activeTab === 'info' && currentBook.infoUrl"
              :src="currentBook.infoUrl"
              frameborder="0"
              class="content-iframe"
            ></iframe>
            <iframe 
              v-if="activeTab === 'text' && currentBook.textUrl"
              :src="currentBook.textUrl"
              frameborder="0"
              class="content-iframe"
            ></iframe>
            <iframe 
              v-if="activeTab === 'image' && currentBook.imageUrl"
              :src="currentBook.imageUrl"
              frameborder="0"
              class="content-iframe"
            ></iframe>
            <div v-if="activeTab === 'table'" class="table-display">
              <!-- 表格展示区域，后续会链接到后端 -->
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
                  <p>表格数据加载区域</p>
                  <p class="note">此区域将链接到后端数据</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ref, onMounted, nextTick, computed } from "vue";
import AIChatBox from './AIChatBox.vue';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';
import FileUpload from './FileUpload.vue';
import FilePagination from './FilePagination.vue';

// Mapbox 相关初始化
mapboxgl.accessToken =
  "pk.eyJ1IjoiY3VkODUiLCJhIjoiY2xrYnFncXZhMGc1cTNlbmFrNHN1N2cxeCJ9.69E3f8nMJkvqQDRhLSojVw";

const mapContainer = ref(null);
const map = ref(null);
const draw = ref(null);
const currentTool = ref(null);
const activeLayers = ref([]); // 当前激活的图层数组

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
const changeBasemap = (mapId) => {
  const selectedMap = basemaps.find(m => m.id === mapId);
  if (selectedMap) {
    map.value.setStyle(selectedMap.style);
    currentBasemap.value = mapId;
  }
  showBasemapList.value = false;
};

// 切换分组展开/折叠
const toggleGroup = (index) => {
  layerGroups.value[index].expanded = !layerGroups.value[index].expanded;
};

// 切换图层的显示/隐藏
const toggleLayer = (layer) => {
  if (activeLayers.value.includes(layer.name)) {
    // 如果激活图层中包含该图层，则添加
    addLayer(layer);
  } else {
    // 否则移除
    removeLayer(layer.name);
  }
};

// 添加图层到地图
const addLayer = (layer) => {
  if (layer.type === "WFS") {
    // WFS 图层
    const wfsUrl = `${layer.url}?service=WFS&version=1.0.0&request=GetFeature&typeName=${layer.layerName}&maxFeatures=50&outputFormat=application/json`;

    fetch(wfsUrl)
      .then((response) => response.json())
      .then((data) => {
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
          type: "fill", // 根据数据类型可以选择 'fill'、'line'、'circle' 等
          source: layer.name,
          paint: {
            "fill-color": getRandomColor(), // 动态生成颜色
            "fill-opacity": 0.5,
          },
        });
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
};

// 移除图层
const removeLayer = (layerName) => {
  if (map.value.getLayer(layerName)) {
    map.value.removeLayer(layerName);
  }
  if (map.value.getSource(layerName)) {
    map.value.removeSource(layerName);
  }
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

// 添加清除所有图层的方法
const clearAllLayers = () => {
  // 遍历所有激活的图层并移除
  activeLayers.value.forEach(layerName => {
    removeLayer(layerName);
  });
  // 清空激活图层数组
  activeLayers.value = [];
};

// 处理图层切换
const handleToggleLayers = (layerNames) => {
  layerNames.forEach(name => {
    const layer = layerGroups.value[0].layers.find(l => l.name === name);
    if (layer) {
      if (!activeLayers.value.includes(name)) {
        activeLayers.value.push(name);
        addLayer(layer);
      }
    }
  });
};

// 添加重置视图函数
const resetView = () => {
  map.value.flyTo({
    center: [108.9398, 34.3409], // 中国中心位置
    zoom: 4,  // 适合查看整个中国的缩放级别
    bearing: 0, // 恢复默认方向
    pitch: 0    // 恢复默认俯仰角
  });
};

// 初始化地图
onMounted(async () => {
  if (mapContainer.value) {
    try {
      // 创建地图实例
      map.value = new mapboxgl.Map({
        container: mapContainer.value,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [118.7915619, 32.0615513],
        zoom: 3,
        preserveDrawingBuffer: true
      });

      // 等待地图加载完成
      await new Promise((resolve) => {
        map.value.on('load', () => {
          console.log('Map loaded successfully');
          resolve();
        });
      });

      // 初始化绘图工具
      draw.value = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          line_string: true,
          polygon: true,
          trash: true
        }
      });

      // 添加绘图控件
      map.value.addControl(draw.value);

      // 添加事件监听
      map.value.on('draw.create', updateMeasurement);
      map.value.on('draw.update', updateMeasurement);
      map.value.on('draw.delete', clearMeasurements);

    } catch (error) {
      console.error('Map initialization error:', error);
    }
  }
});

// 测量相关方法
const toggleMeasurement = (type) => {
  if (currentTool.value === type) {
    currentTool.value = null;
    draw.value?.deleteAll();
    draw.value?.changeMode('simple_select');
  } else {
    currentTool.value = type;
    draw.value?.deleteAll();
    if (type === 'area') {
      draw.value?.changeMode('draw_polygon');
    } else if (type === 'distance') {
      draw.value?.changeMode('draw_line_string');
    }
  }
};

// 更新测量结果显示方法
const updateMeasurement = (e) => {
  if (!e.features.length) return;
  
  const data = e.features[0];
  if (data.geometry.type === 'Polygon' && currentTool.value === 'area') {
    const area = turf.area(data);
    const areaKm = (area / 1000000).toFixed(2);
    
    // 创建一个固定的弹窗
    const popup = new mapboxgl.Popup({
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
    
    // 创建一个固定的弹窗
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'measurement-result'
    })
      .setLngLat(coordinates[coordinates.length - 1])
      .setHTML(`<div class="measurement-value">距离: ${length} 公里</div>`)
      .addTo(map.value);
  }
};

// 修改清除测量方法
const clearMeasurements = () => {
  draw.value?.deleteAll();
  currentTool.value = null;
  
  // 移除所有测量结果弹窗
  const popups = document.getElementsByClassName('mapboxgl-popup');
  while(popups[0]) {
    popups[0].remove();
  }
};

// 添加地图移动事件监听，更新测量结果位置
onMounted(() => {
  // ... 现有的初始化代码 ...

  // 添加地图移动事件监听
  map.value.on('move', () => {
    const measurementDiv = document.getElementById('measurement-result');
    if (measurementDiv && draw.value.getAll().features.length > 0) {
      const feature = draw.value.getAll().features[0];
      if (feature.geometry.type === 'Polygon') {
        const center = turf.center(feature);
        const point = map.value.project(center.geometry.coordinates);
        measurementDiv.style.left = `${point.x + 10}px`;
        measurementDiv.style.top = `${point.y - 30}px`;
      } else if (feature.geometry.type === 'LineString') {
        const coordinates = feature.geometry.coordinates;
        const endPoint = coordinates[coordinates.length - 1];
        const point = map.value.project(endPoint);
        measurementDiv.style.left = `${point.x + 10}px`;
        measurementDiv.style.top = `${point.y - 30}px`;
      }
    }
  });
});

// 添加分屏相关状态
const showBookViewer = ref(false);
const currentBook = ref({
  title: '',
  url: ''
});

// 在地图初始化时添加点击事件监听
onMounted(async () => {
  // ... 现有的初始化代码 ...

  // 添加主板块图层点击事件
  map.value.on('click', '主板块', (e) => {
    if (e.features.length > 0) {
      const feature = e.features[0];
      currentBook.value = {
        title: feature.properties.name || '板块信息',
        url: 'https://example.com/book' // 替换为实际URL
      };
      showBookViewer.value = true;
      
      // 触发地图重新渲染以适应新的容器大小
      setTimeout(() => {
        map.value.resize();
      }, 300);
    }
  });
});

// 关闭书籍查看器
const closeBookViewer = () => {
  showBookViewer.value = false;
  setTimeout(() => {
    map.value.resize();
  }, 300);
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

// 切换地图显示
const toggleMap = () => {
  showMap.value = !showMap.value;
};

// 添加活动标签状态
const activeTab = ref('info');  // 默认显示书籍信息
</script>

<style scoped>
#map {
  position: relative;
  width: 100%;
  height: 100vh;
}

#controls {
  position: absolute;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  max-height: 80vh;
  overflow-y: auto;
  min-width: 300px;
  max-width: 400px;
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
  backdrop-filter: blur(10px);
}

#controls h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
  text-align: center;
  position: relative;
}

#controls h3::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 2px;
  background: #3b82f6;
}

#controls .group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 10px 12px;
  background: #f9fafb;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition: all 0.2s ease;
  margin-bottom: 8px;
}

#controls .group-title:hover {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

#controls .group-title strong {
  font-size: 14px;
  color: #4b5563;
}

#controls .group-title span {
  color: #9ca3af;
  font-size: 16px;
  font-weight: bold;
}

#controls .layer-list {
  padding: 8px 12px 8px 24px;
  background: #ffffff;
  border-radius: 8px;
  margin: 4px 0 12px;
  border: 1px solid #f0f0f0;
}

#controls .layer-list li {
  display: flex;
  align-items: center;
  padding: 6px 0;
  transition: background-color 0.2s ease;
  border-radius: 4px;
}

#controls .layer-list li:hover {
  background: #f9fafb;
}

#controls input[type="checkbox"] {
  margin-right: 8px;
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
}

#controls label {
  cursor: pointer;
  font-size: 13px;
  color: #4b5563;
}

#controls label:hover {
  color: #1f2937;
}

/* 清除按钮容器样式 */
.clear-button-container {
  margin-bottom: 16px;
  padding: 0 4px;
}

.clear-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 12px;
  background: #f9fafb;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

.clear-button:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #ef4444;
  color: #dc2626;
}

.clear-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-icon {
  margin-right: 8px;
  font-size: 16px;
}

/* 底图选择器样式 */
.basemap-selector {
  margin-bottom: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  color: #4b5563;
}

.selector-header:hover {
  background: #f3f4f6;
  color: #3b82f6;
}

.arrow {
  font-size: 12px;
  color: #9ca3af;
}

.basemap-list {
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.basemap-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f0f0f0;
}

.basemap-item:last-child {
  border-bottom: none;
}

.basemap-item:hover {
  background: #f3f4f6;
}

.basemap-item.active {
  background: #eff6ff;
  color: #3b82f6;
  font-weight: 500;
}

/* 重置视图按钮样式 */
.reset-view-icon {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  z-index: 1000;
  opacity: 0.9;
  transition: all 0.3s ease;
  color: #3b82f6;
  filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.2));
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid #f0f0f0;
}

.reset-view-icon svg {
  width: 24px;
  height: 24px;
}

.reset-view-icon:hover {
  transform: scale(1.05);
  filter: drop-shadow(0 4px 8px rgba(59, 130, 246, 0.4));
  background: #f0f7ff;
}

.reset-view-icon:active {
  transform: scale(0.95);
}

/* 添加笔画动画效果 */
.globe-paths {
  stroke-dasharray: 100;
  animation: drawGlobe 2s ease-out forwards;
}

@keyframes drawGlobe {
  from {
    stroke-dashoffset: 100;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* 修改测量工具栏位置 */
.measure-toolbar {
  display: none; /* 隐藏旧的工具栏 */
}

/* 添加地图控制按钮组样式 */
.map-controls-group {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
}

/* 通用地图控制图标样式 */
.map-control-icon {
  width: 40px;
  height: 40px;
  cursor: pointer;
  z-index: 1000;
  opacity: 0.9;
  transition: all 0.3s ease;
  color: #3b82f6;
  filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.2));
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid #f0f0f0;
}

.map-control-icon svg {
  width: 24px;
  height: 24px;
}

.map-control-icon:hover {
  transform: scale(1.05);
  filter: drop-shadow(0 4px 8px rgba(59, 130, 246, 0.4));
  background: #f0f7ff;
}

.map-control-icon:active {
  transform: scale(0.95);
}

.map-control-icon.active {
  background: #eff6ff;
  color: #3b82f6;
  border-color: #3b82f6;
  box-shadow: 0 2px 10px rgba(59, 130, 246, 0.3);
}

/* 测量结果弹窗样式 */
.mapboxgl-popup-content {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #f0f0f0;
  background: white;
}

.measurement-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
}

/* 隐藏弹窗尖角 */
.measurement-result .mapboxgl-popup-tip {
  display: none;
}

/* 重置视图按钮样式保持不变，但移动到控制组中 */
.reset-view-icon {
  position: relative;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  cursor: pointer;
  z-index: 1000;
  opacity: 0.9;
  transition: all 0.3s ease;
  color: #3b82f6;
  filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.2));
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid #f0f0f0;
}

/* 修改地图缩小时的控制组样式 */
.map-section.map-shrink {
  flex: 0 0 60%;
  transform: scale(0.8);
  
  /* 调整控件位置和缩放 */
  #controls {
    position: absolute;
    top: 50%;
    right: 20px;
    transform: translateY(-50%) scale(0.9);
    transform-origin: right center;
  }
  
  /* 调整控制组的缩放比例 */
  .map-controls-group {
    transform: scale(1.1);
    transform-origin: left top;
  }
  
  .ai-chat-box {
    transform: scale(0.9);
    transform-origin: right bottom;
    right: 20px;
  }

  /* 补偿地图容器尺寸 */
  #map {
    width: 125%;
    height: 125%;
    transform-origin: left top;
  }
}

/* 调整顶部控制组件的位置，避免与新的控制按钮重叠 */
.top-controls {
  position: absolute;
  top: 20px;
  left: 80px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 400px;
}

/* 分屏布局样式 */
.split-container {
  width: 100%;
  height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
}

/* 左侧地图区域样式 */
.map-section {
  position: relative;
  flex: 1;
  transition: all 0.3s ease;
  transform-origin: left top;
}

/* 右侧书籍查看器样式 */
.book-viewer {
  position: absolute;
  right: -40%;
  top: 0;
  width: 40%;
  height: 100%;
  background: #ffffff;
  box-shadow: -5px 0 25px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #f0f0f0;
}

.book-viewer.viewer-show {
  right: 0;
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #ffffff;
}

.viewer-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-viewer {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
}

.close-viewer:hover {
  background: #fee2e2;
  color: #ef4444;
}

.viewer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-tabs {
  padding: 0;
  display: flex;
  background: #f9fafb;
  border-bottom: 1px solid #f0f0f0;
}

.tab-btn {
  flex: 1;
  padding: 14px 8px;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
}

.tab-btn:hover {
  background: #f3f4f6;
  color: #3b82f6;
}

.tab-btn.active {
  background: #ffffff;
  color: #3b82f6;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: #3b82f6;
}

.tab-icon {
  font-size: 20px;
}

.content-display {
  flex: 1;
  overflow: hidden;
  background: #fff;
}

.content-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

/* 表格展示区域样式 */
.table-display {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.table-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid #eaeaea;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.refresh-btn:hover {
  color: #3b82f6;
}

.export-btn:hover {
  color: #10b981;
}

.table-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.table-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f9fafb;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #d1d5db;
}

.table-placeholder p {
  margin: 5px 0;
  font-size: 16px;
  color: #6b7280;
}

.table-placeholder .note {
  font-size: 14px;
  color: #9ca3af;
  margin-top: 8px;
}

/* 自定义滚动条 */
.table-content::-webkit-scrollbar {
  width: 6px;
}

.table-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.table-content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.table-content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .map-section.map-shrink {
    display: none;
  }
  
  .book-viewer {
    width: 100%;
    right: -100%;
  }
  
  .book-viewer.viewer-show {
    right: 0;
    width: 100%;
  }
}

/* 添加左上角功能控制组件样式 */
.top-controls {
  position: absolute;
  top: 20px;
  left: 80px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 400px;
}

.control-buttons {
  display: flex;
  flex-direction: row;
  justify-content: space-between;  /* 改为两端对齐 */
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  width: 100%;  /* 占满容器宽度 */
}

.control-btn {
  flex: 1;  /* 平均分配空间 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 64px;
  height: 40px;
}

.control-btn:hover {
  background: #ecf5ff;
  border-color: #409eff;
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.btn-text {
  font-size: 12px;
  color: #606266;
}

.panel-content {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 16px;
  max-width: 400px;
  max-height: 600px;
  overflow-y: auto;
  width: 100%;
}

/* 确保文件列表内容更紧凑 */
:deep(.file-list-item) {
  padding: 10px;
  margin-bottom: 8px;
}

:deep(.file-pagination) {
  margin-top: 12px;
}

/* 优化文件列表表格布局 */
:deep(.file-table) {
  width: 100%;
  border-collapse: collapse;
}

:deep(.file-table th),
:deep(.file-table td) {
  padding: 8px;
  text-align: left;
  white-space: nowrap;
}

:deep(.file-table-container) {
  overflow-x: auto;
  margin-bottom: 10px;
}

/* 调整专题底图数据面板的基础尺寸 */
#controls {
  min-width: 300px;
  max-width: 400px;
  padding: 20px;
}

/* 调整测量工具栏按钮的大小 */
.measure-btn {
  padding: 8px 16px;
  height: 40px;       /* 增加高度 */
  font-size: 15px;    /* 增加字体大小 */
  min-width: 90px;    /* 添加最小宽度 */
  
  .icon {
    font-size: 18px;  /* 增加图标大小 */
  }
}

.table-display {
  width: 100%;
  height: 100%;
  padding: 15px;
  overflow: auto;
}

.table-display h4 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 16px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.table-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100% - 50px);
  background: #f9f9f9;
  border: 1px dashed #ddd;
  border-radius: 8px;
  padding: 20px;
}

.table-placeholder p {
  margin: 5px 0;
  font-size: 16px;
  color: #666;
}

.table-placeholder .note {
  font-size: 14px;
  color: #999;
  font-style: italic;
}
</style>
