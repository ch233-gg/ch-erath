<template>
  <div 
    class="ai-chat-box" 
    :class="{ 'is-expanded': isExpanded }"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    ref="chatBox"
  >
    <!-- 聊天框头部 -->
    <div 
      class="chat-header" 
      @mousedown="startDrag"
      @click="toggleExpand"
    >
      <div class="header-content">
        <span class="ai-icon">🤖</span>
        <span class="title">AI 助手</span>
      </div>
      <span class="toggle-icon">{{ isExpanded ? '▼' : '▲' }}</span>
    </div>

    <!-- 聊天内容区域 -->
    <div class="chat-content" v-show="isExpanded">
      <div class="messages" ref="messageContainer">
        <div v-for="(message, index) in messages" 
             :key="index" 
             :class="['message', message.role]">
          <div class="avatar">
            {{ message.role === 'assistant' ? '🤖' : '👤' }}
          </div>
          <div class="message-content">{{ message.content }}</div>
        </div>
      </div>

      <!-- 快捷功能按钮 -->
      <div class="quick-actions">
        <button @click="quickAction('control')" title="自然语言控制">
          <span class="icon">🎮</span>
          <span class="text">控制</span>
        </button>
        <button @click="quickAction('explain')" title="数据解释">
          <span class="icon">📊</span>
          <span class="text">解释</span>
        </button>
        <button @click="quickAction('recommend')" title="图层推荐">
          <span class="icon">🗺️</span>
          <span class="text">推荐</span>
        </button>
      </div>

      <!-- 输入框区域 -->
      <div class="input-area">
        <input
          v-model="userInput"
          @keyup.enter="sendMessage"
          placeholder="输入问题或指令..."
          type="text"
        />
        <button @click="sendMessage">
          <span class="send-icon">📤</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import mapboxgl from 'mapbox-gl';

const props = defineProps({
  map: {
    type: Object,
    required: true
  }
});

const isExpanded = ref(false);
const userInput = ref('');
const messages = ref([
  { role: 'assistant', content: '你好！我是AI助手，可以帮助你：\n1. 用自然语言控制地图\n2. 解释数据含义\n3. 推荐合适的图层' }
]);

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

// 快捷操作
const quickAction = (type) => {
  switch(type) {
    case 'control':
      userInput.value = "请帮我显示所有与气候相关的图层";
      break;
    case 'explain':
      userInput.value = "请解释一下这个图层显示的数据代表什么？";
      break;
    case 'recommend':
      userInput.value = "我想研究板块构造，推荐相关图层";
      break;
  }
};

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim()) return;

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: userInput.value
  });

  // TODO: 这里添加实际的 AI 处理逻辑
  // 模拟 AI 响应
  const aiResponse = await processAIResponse(userInput.value);
  messages.value.push({
    role: 'assistant',
    content: aiResponse
  });

  userInput.value = '';
};

// 在 script setup 中添加地理编码函数
const geocodeCity = async (cityName) => {
  try {
    // 使用 Mapbox Geocoding API
    const accessToken = 'pk.eyJ1IjoiY3VkODUiLCJhIjoiY2xrYnFncXZhMGc1cTNlbmFrNHN1N2cxeCJ9.69E3f8nMJkvqQDRhLSojVw';
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityName)}.json?access_token=${accessToken}&country=cn`
    );
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return {
        coordinates: [lng, lat],
        placeName: data.features[0].place_name
      };
    }
    return null;
  } catch (error) {
    console.error('地理编码错误:', error);
    return null;
  }
};

// 修改 processAIResponse 中的定位处理部分
const processAIResponse = async (input) => {
  const lowercaseInput = input.toLowerCase();
  
  // 处理定位请求
  if (lowercaseInput.includes('定位') || lowercaseInput.includes('查看') || lowercaseInput.includes('前往')) {
    // 预设城市坐标（用于快速响应常用城市）
    const commonLocations = {
      '南京': [118.7915619, 32.0615513],
      '北京': [116.4074, 39.9042],
      '上海': [121.4737, 31.2304],
      '广州': [113.2644, 23.1291],
      '深圳': [114.0579, 22.5431],
      '杭州': [120.1551, 30.2741]
    };

    // 尝试从输入中提取城市名称
    const cityMatch = input.match(/[定位|查看|前往]到?(.+)/) || 
                     input.match(/去(.+)/) || 
                     input.match(/看看(.+)/);
    
    if (cityMatch) {
      const cityName = cityMatch[1].replace(/市$/, '').trim();
      
      // 首先检查是否是预设城市
      if (commonLocations[cityName]) {
        props.map.flyTo({
          center: commonLocations[cityName],
          zoom: 10,
          essential: true
        });
        return `正在为您定位到${cityName}...`;
      }
      
      // 如果不是预设城市，使用地理编码服务
      const location = await geocodeCity(cityName);
      if (location) {
        props.map.flyTo({
          center: location.coordinates,
          zoom: 10,
          essential: true
        });
        return `正在为您定位到${location.placeName}...`;
      } else {
        return `抱歉，我找不到${cityName}的位置信息。`;
      }
    }
  }

  // 处理图层控制
  if (lowercaseInput.includes('显示') || lowercaseInput.includes('打开')) {
    if (lowercaseInput.includes('气候')) {
      // 触发父组件的图层控制方法
      emit('toggleLayers', ['亚洲气候与地貌', '亚洲气候水文', '亚洲气候线', '亚洲气候多边形']);
      return '已为您显示所有气候相关图层';
    }
    if (lowercaseInput.includes('板块')) {
      emit('toggleLayers', ['主板块', '亚板块']);
      return '已为您显示板块相关图层';
    }
  }

  // 处理缩放控制
  if (lowercaseInput.includes('放大')) {
    props.map.zoomIn();
    return '正在放大地图...';
  }
  if (lowercaseInput.includes('缩小')) {
    props.map.zoomOut();
    return '正在缩小地图...';
  }

  // 其他预设响应
  const responses = {
    '请帮我显示所有与气候相关的图层': '好的，我帮你打开以下气候相关图层：\n- 亚洲气候与地貌\n- 亚洲气候水文\n- 亚洲气候线\n- 亚洲气候多边形',
    '请解释一下这个图层显示的数据代表什么？': '当前显示的是亚洲气候分布图层，不同颜色代表不同的气候类型。红色区域表示热带气候，黄色区域表示温带气候，蓝色区域表示寒带气候。',
    '我想研究板块构造，推荐相关图层': '为了研究板块构造，我建议你查看这些图层：\n1. 主板块\n2. 亚板块\n3. 全球活动构造板块及其边界带数据集\n4. 全球板块边界及其类型数据集'
  };

  return responses[input] || `我理解您想${input}，正在处理...`;
};

// 定义事件
const emit = defineEmits(['toggleLayers']);

// 添加拖拽相关的状态
const position = ref({ x: 20, y: window.innerHeight - 500 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const chatBox = ref(null);

// 开始拖拽
const startDrag = (e) => {
  isDragging.value = true;
  const rect = chatBox.value.getBoundingClientRect();
  dragOffset.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };

  // 添加全局事件监听
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

// 拖拽中
const onDrag = (e) => {
  if (isDragging.value) {
    position.value = {
      x: e.clientX - dragOffset.value.x,
      y: e.clientY - dragOffset.value.y
    };
  }
};

// 停止拖拽
const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};
</script>

<style scoped>
.ai-chat-box {
  position: fixed;
  width: 320px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  backdrop-filter: blur(10px);
  transition: transform 0.3s ease;
  user-select: none;
}

.ai-chat-box:hover {
  transform: translateY(-2px);
}

.chat-header {
  padding: 12px 16px;
  background: linear-gradient(135deg, #409eff, #3178c6);
  color: white;
  border-radius: 12px 12px 0 0;
  cursor: move;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-icon {
  font-size: 20px;
}

.title {
  font-weight: 600;
  font-size: 15px;
}

.chat-content {
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  max-height: 300px;
}

.message {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: flex-start;
}

.avatar {
  font-size: 20px;
  min-width: 24px;
}

.message-content {
  padding: 10px;
  border-radius: 12px;
  max-width: 80%;
  line-height: 1.4;
}

.message.user {
  flex-direction: row-reverse;
}

.message.user .message-content {
  background: #e8f4ff;
  border-radius: 12px 2px 12px 12px;
}

.message.assistant .message-content {
  background: #f5f7fa;
  border-radius: 2px 12px 12px 12px;
}

.quick-actions {
  display: flex;
  justify-content: space-around;
  padding: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.8);
}

.quick-actions button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.quick-actions button:hover {
  background: rgba(64, 158, 255, 0.1);
}

.quick-actions .icon {
  font-size: 20px;
}

.quick-actions .text {
  font-size: 12px;
  color: #666;
}

.input-area {
  display: flex;
  padding: 12px 16px;
  gap: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 0 0 12px 12px;
}

.input-area input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #e4e7ed;
  border-radius: 20px;
  outline: none;
  transition: all 0.3s;
}

.input-area input:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.input-area button {
  background: #409eff;
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.input-area button:hover {
  background: #66b1ff;
  transform: scale(1.05);
}

.send-icon {
  font-size: 16px;
}

/* 自定义滚动条 */
.messages::-webkit-scrollbar {
  width: 5px;
}

.messages::-webkit-scrollbar-track {
  background: transparent;
}

.messages::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}
</style> 