# 导航滚动功能

## 功能概述

当窗口分辨率较小时，导航栏可能无法完整显示所有导航按钮。为了解决这个问题，我们实现了导航滚动功能，确保：

1. **底部患者信息始终可见** - 患者信息区域优先级最高，始终保持在可视区域
2. **智能滚动箭头** - 根据内容是否溢出自动显示/隐藏滚动箭头
3. **平滑滚动体验** - 使用CSS动画实现平滑的滚动效果

## 技术实现

### HTML结构

```html
<div class="sidebar-nav">
  <!-- 向上滚动箭头 -->
  <button class="nav-scroll-arrow nav-scroll-up">▲</button>
  
  <!-- 导航滚动容器 -->
  <div class="nav-scroll-container">
    <div class="nav-items-container">
      <!-- 导航按钮 -->
    </div>
  </div>
  
  <!-- 向下滚动箭头 -->
  <button class="nav-scroll-arrow nav-scroll-down">▼</button>
</div>
```

### CSS样式

```css
.sidebar-nav {
  flex: 1;
  overflow: hidden;
  min-height: 0; /* 允许flex子元素收缩 */
}

.nav-scroll-container {
  flex: 1;
  overflow: hidden;
}

.nav-items-container {
  transition: transform 0.3s ease;
}

.nav-scroll-arrow {
  display: none; /* 默认隐藏 */
}

.nav-scroll-arrow.visible {
  display: flex; /* 需要时显示 */
}
```

### JavaScript逻辑

#### 初始化

```javascript
function initializeNavScroll() {
  const container = document.getElementById('navScrollContainer');
  const navItems = document.querySelectorAll('.nav-item');
  
  totalItems = navItems.length;
  
  // 计算可视区域能容纳的项目数量
  const containerHeight = container.clientHeight;
  const itemHeight = 68 + 6; // 项目高度 + 间距
  maxVisibleItems = Math.floor(containerHeight / itemHeight);
  
  // 重置滚动位置
  currentScrollIndex = 0;
  updateNavScroll();
}
```

#### 滚动更新

```javascript
function updateNavScroll() {
  const itemsContainer = document.getElementById('navItemsContainer');
  const scrollUpBtn = document.getElementById('navScrollUp');
  const scrollDownBtn = document.getElementById('navScrollDown');
  
  // 计算滚动偏移
  const itemHeight = 68 + 6;
  const translateY = -currentScrollIndex * itemHeight;
  itemsContainer.style.transform = `translateY(${translateY}px)`;
  
  // 更新箭头显示状态
  scrollUpBtn.classList.toggle('visible', currentScrollIndex > 0);
  scrollDownBtn.classList.toggle('visible', 
    currentScrollIndex + maxVisibleItems < totalItems);
}
```

## 响应式设计

### 窗口大小变化处理

```javascript
window.addEventListener('resize', () => {
  setTimeout(initializeNavScroll, 100);
});
```

### 折叠/展开时重新计算

```javascript
async function toggleCollapse() {
  // ... 折叠逻辑 ...
  
  // 折叠/展开后重新初始化滚动
  setTimeout(initializeNavScroll, 100);
}
```

### 患者信息更新时重新计算

```javascript
function updatePatientInfo() {
  // ... 更新患者信息显示 ...
  
  // 患者信息更新后重新计算导航滚动
  // 需要延迟执行，等待DOM更新完成
  setTimeout(() => {
    initializeNavScroll();
  }, 50);
}
```

### 智能滚动位置调整

```javascript
function initializeNavScroll() {
  // ... 计算新的可视项目数量 ...
  
  // 如果当前滚动位置超出了新的范围，调整滚动位置
  if (currentScrollIndex + maxVisibleItems > totalItems) {
    currentScrollIndex = Math.max(0, totalItems - maxVisibleItems);
  }
  
  updateNavScroll();
}
```

## 用户交互

### 滚动操作

- **向上滚动**: 点击 ▲ 箭头，显示上方被隐藏的导航按钮
- **向下滚动**: 点击 ▼ 箭头，显示下方被隐藏的导航按钮

### 视觉反馈

- 箭头按钮有悬停效果和点击反馈
- 滚动动画平滑自然，持续时间0.3秒
- 箭头只在需要时显示，避免界面混乱

## 优先级设计

1. **患者信息区域** - 最高优先级，始终可见
2. **当前激活的导航按钮** - 确保用户知道当前位置
3. **其他导航按钮** - 通过滚动访问

## 兼容性

- 支持所有现代浏览器
- 在Electron环境中完美运行
- 适配不同屏幕分辨率和DPI设置

## 测试建议

1. **分辨率测试**: 在不同分辨率下测试滚动功能
2. **动态调整**: 实时调整窗口大小，观察箭头显示逻辑
3. **交互测试**: 频繁点击滚动箭头，确保状态正确
4. **边界测试**: 测试滚动到顶部和底部的边界情况

## 性能优化

- 使用CSS `transform` 而非改变 `top` 值，利用GPU加速
- 防抖处理窗口大小变化事件
- 只在必要时重新计算布局参数

## 问题解决

### 患者信息更新导致滚动显示异常

**问题描述**: 当应用启动时患者信息较少，滚动到最后一个导航按钮可以完整显示。但当通过API调用传入完整患者信息后，患者信息区域高度增加，导致最后一个导航按钮被部分遮挡。

**解决方案**: 
1. 在 `updatePatientInfo()` 函数中添加滚动重新计算
2. 在 `initializeNavScroll()` 函数中添加智能位置调整
3. 确保滚动位置不会超出有效范围

**技术实现**:
```javascript
// 在患者信息更新后重新计算
function updatePatientInfo() {
  // ... 更新显示 ...
  setTimeout(() => {
    initializeNavScroll();
  }, 50);
}

// 智能调整滚动位置
function initializeNavScroll() {
  // ... 计算参数 ...
  if (currentScrollIndex + maxVisibleItems > totalItems) {
    currentScrollIndex = Math.max(0, totalItems - maxVisibleItems);
  }
}
```

## 未来扩展

- 支持鼠标滚轮滚动
- 支持触摸设备的滑动手势
- 添加滚动位置指示器
- 支持键盘导航（上下箭头键） 