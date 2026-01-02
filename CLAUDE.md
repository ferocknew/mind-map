# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个思维导图库和 Web 应用项目，包含两个主要部分：
- **simple-mind-map**: 核心 JavaScript 思维导图库，不依赖任何框架
- **web**: 基于 Vue2.x 和 ElementUI 的 Web 思维导图应用

项目使用 pnpm 作为包管理器（pnpm-workspace.yaml）

## 常用命令

### 开发核心库 (simple-mind-map)
```bash
cd simple-mind-map
npm run lint        # ESLint 检查
npm run format      # Prettier 格式化
npm run types       # 生成 TypeScript 类型定义
npm run wsServe     # WebSocket 服务器（用于开发）
```

### 开发 Web 应用
```bash
cd web
npm run serve       # 启动开发服务器
npm run build       # 构建生产版本
npm run lint        # ESLint 检查
npm run format      # Prettier 格式化
npm run ai:serve    # 启动 AI 聊天服务器
npm run createNodeImageList  # 生成节点图片列表
```

### 构建库
```bash
cd web
npm run buildLibrary  # 构建 simple-mind-map 库到 simple-mind-map/dist
                      # 生成 UMD、ESM 格式
```

## 代码架构

### 核心库架构 (simple-mind-map)

核心库采用插件化架构，主要包含以下模块：

#### 1. 主入口 (`index.js`)
- `MindMap` 类是核心类，负责初始化和管理整个思维导图实例
- 实例化时创建：`Event`（事件）、`KeyCommand`（按键命令）、`Command`（命令）、`Render`（渲染）、`View`（视图操作）
- 支持插件注册：通过 `MindMap.usePlugin()` 静态方法注册插件

#### 2. 核心模块
- **Event** (`src/core/event/Event.js`): 事件管理器，处理 DOM 事件和自定义事件
- **KeyCommand** (`src/core/command/KeyCommand.js`): 快捷键管理
- **Command** (`src/core/command/Command.js`): 命令模式，支持历史记录（撤销/重做）
- **Render** (`src/core/render/Render.js`): 渲染器，管理节点树渲染和布局
- **View** (`src/core/view/View.js`): 视图操作，处理画布缩放、拖拽等

#### 3. 布局系统 (`src/layouts/`)
- 所有布局继承自 `Base` 基类
- 布局类型：
  - `LogicalStructure`: 逻辑结构图（向左、向右）
  - `MindMap`: 思维导图
  - `OrganizationStructure`: 组织结构图
  - `CatalogOrganization`: 目录组织图
  - `Timeline`: 时间轴（横向、竖向）
  - `Fishbone`: 鱼骨图
- 每个布局必须实现：`doLayout()`、`renderLine()`、`renderExpandBtn()`

#### 4. 插件系统 (`src/plugins/`)
插件基类 `Base`，插件可访问 `mindMap` 实例。内置插件：
- **RichText**: 节点富文本编辑（基于 Quill）
- **Select**: 鼠标框选多节点
- **Drag**: 节点拖拽移动
- **AssociativeLine**: 关联线
- **Export**: 导出（PNG、SVG、PDF、JSON、Markdown、XMind）
- **KeyboardNavigation**: 键盘导航
- **MiniMap**: 小地图
- **Watermark**: 水印
- **Search**: 搜索替换
- **Cooperate**: 协同编辑（基于 Yjs）
- **Demonstrate**: 演示模式
- **RainbowLines**: 彩虹线条
- **OuterFrame**: 外框
- **Formula**: 数学公式（基于 KaTeX）

#### 5. 节点渲染 (`src/core/render/node/`)
- `MindMapNode`: 节点类，管理节点的渲染、尺寸计算、内容创建
- `Shape`: 节点形状（矩形、圆角矩形、椭圆、菱形等）
- `Style`: 节点样式管理

#### 6. 主题系统 (`src/theme/`)
- 内置多种主题，通过 `MindMap.defineTheme()` 定义新主题
- 主题配置控制：节点背景、边框、连线样式、字体等

### Web 应用架构 (web)

Vue 2.x 单页应用，主要目录：
- `src/pages/Edit/`: 编辑页面，包含主编辑器 (`Edit.vue`) 和各种侧边栏/对话框组件
- `src/config/`: 多语言配置（中文、英文、繁体中文）
- `src/api/index.js`: 本地存储 API
- `src/utils/`: 工具类，包含 AI 相关模块

### AI 功能架构

#### 1. AI 适配器系统 (`src/utils/ai_adapters/`)
- **base.js**: 适配器基类，定义通用接口
- **openai.js**: OpenAI 兼容适配器（支持火山引擎等 OpenAI 兼容服务）
- **anthropic.js**: Anthropic Claude 适配器

#### 2. AI 核心模块 (`src/utils/ai.js`)
- `Ai` 类：统一的 AI 接口封装
- 支持流式响应
- 工具调用（Function Calling）支持
- 自动处理多种 AI 服务的差异

#### 3. 工具调用系统 (`src/function_calling/`)
内置工具定义在 `tools/` 目录：
- `add_node`: 添加子节点
- `read_map`: 读取当前思维导图
- `delete_node`: 删除节点
- `update_node`: 更新节点内容
- `overwrite_map`: 覆盖整个思维导图

#### 4. AI 聊天界面
- `ai_chat.vue`: AI 聊天主界面
- `ai_chat_history.vue`: 会话历史管理
- `AiConfigDialog.vue`: AI 配置对话框
- `AiCreate.vue`: AI 创建节点功能

#### 5. AI 配置存储
- `src/utils/ai_chat_storage.js`: AI 配置持久化
- 支持全局规则/系统提示词配置
- 本地存储多种 AI 服务配置

### 数据流

1. **节点数据结构**:
```javascript
{
  data: {
    text: '根节点',
    uid: 'xxx',
    // 其他属性...
  },
  children: [
    // 子节点...
  ]
}
```

2. **渲染流程**:
   - `MindMap.render()` → `Render.render()` → 布局类 `doLayout()` → `MindMapNode` 渲染

3. **命令执行**:
   - `execCommand(name, ...args)` → `Command.exec()` → 执行对应命令处理器 → 自动添加历史记录

## 开发注意事项

### 命名规范
1. **文件命名**: 使用小写字母和下划线分隔
   - 正确: `ai_chat.vue`, `ai_config_dialog.vue`
   - 错误: `AiChat.vue`, `AiConfig.vue`
2. **组件注册**: 组件名使用 PascalCase
   - 例如: `ai_chat` → `Ai_chat`（在 components 中注册）

### 代码修改原则
1. **最小修改范围**: 只修改与任务直接相关的代码
2. **保持原有逻辑**: 避免重构无关的业务逻辑
3. **减少影响范围**: 保持代码风格一致

### 插件开发
- 插件通过 `MindMap.usePlugin(PluginClass)` 注册
- 插件类的 `instanceName` 属性决定实例挂载到 `mindMap` 上的属性名

### 布局开发
- 继承 `layouts/Base`
- 实现必要方法
- 在 `Render.js` 的 `layouts` 对象中注册

### 主题定制
- 使用 `setThemeConfig()` 修改主题配置
- 或用 `MindMap.defineTheme()` 定义新主题

### 节点复用
- 渲染时会复用已有节点实例（通过 `uid`）
- 只有数据改变时才重新计算尺寸

### 性能优化
- `openPerformance` 配置开启时，只渲染可见区域的节点

### 协同编辑
- 基于 Yjs 的 CRDT 实现，支持多人实时编辑

## 不支持的功能

- 自由节点（多根节点）
- 概要节点后继续添加节点

## 导入导出格式

- **导入**: JSON、XMind、Markdown
- **导出**: JSON、PNG、SVG、PDF、Markdown、XMind、TXT

## 部署

项目支持 Docker 部署，参考项目根目录的 `Dockerfile`
