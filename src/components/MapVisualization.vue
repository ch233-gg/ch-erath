<template>
  <div id="map" ref="mapContainer">
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
      :map="map"
      @toggleLayers="handleToggleLayers"
    />
  </div>
</template>

<script setup>
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ref, onMounted, nextTick } from "vue";
import AIChatBox from './AIChatBox.vue';

// Mapbox 相关初始化
mapboxgl.accessToken =
  "pk.eyJ1IjoiY3VkODUiLCJhIjoiY2xrYnFncXZhMGc1cTNlbmFrNHN1N2cxeCJ9.69E3f8nMJkvqQDRhLSojVw";

const map = ref(null);
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

// 初始化 Mapbox 地图
const initializeMap = () => {
  if (map.value) return;

  map.value = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [118.7915619, 32.0615513],
    zoom: 3,
  });
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

// 初始化地图并加载底图
onMounted(() => {
  nextTick(() => {
    initializeMap();
  });
});
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
  left: 20px;
  transform: translateY(-50%);
  z-index: 10;
  background: rgba(250, 251, 252, 0.95);
  padding: 18px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  max-height: 80vh;
  overflow-y: auto;
  min-width: 280px;
  
  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f5f6f7;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #d0d7de;
    &:hover {
      background: #bbc0c4;
    }
  }
}

#controls h3 {
  margin: 0 0 15px 0;
  color: #2f363d;
  font-size: 15px;
  font-weight: 600;
  border-bottom: 2px solid #eaecef;
  padding-bottom: 8px;
  text-align: center;
  position: relative;
}

#controls h3::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 2px;
  background: #409eff;
}

#controls ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

#controls li {
  margin-bottom: 8px;
}

#controls .group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  background: #f6f8fa;
  border: 1px solid #eaecef;
  border-radius: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f1f3f5;
    border-color: #e1e4e8;
  }
}

#controls .group-title strong {
  font-size: 14px;
  color: #444d56;
}

#controls .group-title span {
  color: #6a737d;
  font-size: 16px;
  font-weight: bold;
}

#controls .layer-list {
  padding: 8px 12px 8px 24px;
  background: #ffffff;
  border-radius: 4px;
  margin: 4px 0;
  
  li {
    display: flex;
    align-items: center;
    padding: 4px 0;
    transition: background-color 0.2s ease;
    border-radius: 4px;
    
    &:hover {
      background: #f6f8fa;
    }
  }
}

#controls input[type="checkbox"] {
  margin-right: 8px;
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: #6c8eef;
}

#controls label {
  cursor: pointer;
  font-size: 13px;
  color: #4a5568;
  
  &:hover {
    color: #2d3748;
  }
}

/* 添加清除按钮容器样式 */
.clear-button-container {
  margin-bottom: 16px;
  padding: 0 4px;
}

.clear-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  background: #f5f6f7;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666;
  font-size: 13px;
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
  margin-right: 6px;
  font-size: 16px;
}

/* 添加底图选择器样式 */
.basemap-selector {
  margin-bottom: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f6f8fa;
  cursor: pointer;
  transition: all 0.2s ease;
}

.selector-header:hover {
  background: #ecf5ff;
}

.arrow {
  font-size: 12px;
  color: #909399;
}

.basemap-list {
  background: #fff;
}

.basemap-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.basemap-item:hover {
  background: #f5f7fa;
}

.basemap-item.active {
  background: #ecf5ff;
  color: #409eff;
}

/* 重置视图按钮样式 */
.reset-view-icon {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  z-index: 1000;
  opacity: 0.9;
  transition: all 0.3s ease;
  color: #3B82F6;
  filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.2));
}

.reset-view-icon svg {
  width: 100%;
  height: 100%;
}

.reset-view-icon:hover {
  transform: scale(1.1) rotate(180deg);
  filter: drop-shadow(0 4px 8px rgba(59, 130, 246, 0.4));
}

.reset-view-icon:active {
  transform: scale(0.95) rotate(180deg);
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

/* 添加毛玻璃效果 */
@supports (backdrop-filter: blur(4px)) {
  .reset-view-btn {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(4px);
  }
}

/* 适配深色模式 */
@media (prefers-color-scheme: dark) {
  .reset-view-btn {
    background: rgba(31, 41, 55, 0.9);
  }
  
  .btn-text {
    color: #e5e7eb;
  }
  
  .reset-icon {
    color: #60a5fa;
  }
  
  .btn-backdrop {
    background: linear-gradient(
      135deg,
      rgba(96, 165, 250, 0.1),
      rgba(59, 130, 246, 0.1)
    );
  }
  
  .reset-view-btn:hover .reset-icon,
  .reset-view-btn:hover .btn-text {
    color: #93c5fd;
  }
}
</style>
