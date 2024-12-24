<template>
  <div id="map" ref="mapContainer">
    <!-- 图层控制面板 -->
    <div id="controls">
      <h3>图层控制</h3>
      <ul>
        <li v-for="(group, index) in layerGroups" :key="index">
          <!-- 显示分组标题 -->
          <div @click="toggleGroup(index)" class="group-title">
            <strong>{{ group.title }}</strong>
            <span>{{ group.expanded ? "-" : "+" }}</span>
          </div>
          <!-- 显示组内的图层 -->
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
  </div>
</template>

<script setup>
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ref, onMounted, nextTick } from "vue";

// Mapbox 相关初始化
mapboxgl.accessToken =
  "pk.eyJ1IjoiY3VkODUiLCJhIjoiY2xrYnFncXZhMGc1cTNlbmFrNHN1N2cxeCJ9.69E3f8nMJkvqQDRhLSojVw";

const map = ref(null);
const activeLayers = ref([]); // 当前激活的图层数组

// 图层分组配置
const layerGroups = ref([
  {
    title: "WFS 图层",
    expanded: false, // 控制分组展开/折叠
    layers: [
      {
        name: "Asian Land",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:Asian land",
      },
      {
        name: "Asian Ocean Polygon",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:AsianOceanpolygon",
      },
      {
        name: "Asian Delta",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:Asiandelta",
      },
      {
        name: "Asian Climate and Landforms",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:AsianClimateAndLandforms",
      },
      {
        name: "Asian Climate Water",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:AsianClimateWater",
      },
      {
        name: "Asian Climate Line",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:AsianClimateLine",
      },
      {
        name: "Asian Climate Polygon",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:AsianClimatePolygon",
      },
      {
        name: "Main Plates",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:MainPlates",
      },
      {
        name: "Sub Plates",
        url: "http://172.21.252.158:8181/geoserver/geoData/ows",
        type: "WFS",
        layerName: "geoData:SubPlates",
      },
   
    ],
  },
  {
    title: "WMS 图层",
    expanded: false,
    layers: [
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
</style>
