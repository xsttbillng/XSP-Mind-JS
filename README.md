# XSP-Mind-JS

轻量级 **JSON 驱动** 的流程图 / 思维图 **展示库**。  
适合官网、文档站、标签页、能力地图等「固定版式 + 富节点」场景。

> **不是完整在线编辑器**；默认手动坐标，可选 `tree-right` / `tree-left` / `tree-down` 自动布局。

Author / Copyright: **WUYUANBIAO** · GitHub: [xsttbillng/XSP-Mind-JS](https://github.com/xsttbillng/XSP-Mind-JS) · License: [MIT](LICENSE)

## 能力一览

| 类别 | 能力 |
|------|------|
| 渲染 | 树形 JSON、线型 `line/sline/zline`、可配置箭头样式、连线文字、虚线流动动画 |
| 节点 | `x/y/width/height`、`className`、可选 HTML 文本 |
| 交互 | 拖拽、点击选中、双击改文字、空白处平移、滚轮缩放 |
| 编辑 API | `addNode` / `updateNode` / `removeNode` / `getData` / `toJSON` |
| 布局 | `tree-right` / `tree-left` / `tree-down` 或 `applyLayout(...)` |
| 导入 | `importJSON(text)` / `setData(data)` |
| 主题 | `theme: "default" \| "dark" \| "athens-blue"` 或 `applyTheme()` |
| 导出 | `exportJSON` / `exportSVG` / `exportPNG` |
| 视口 | `fitContent` / `fitToViewport` / `resetView` / `setZoom` |

## 依赖

- [@svgdotjs/svg.js](https://svgjs.dev/) `^3.2`

```html
<link rel="stylesheet" href="src/xsp-mind.css" />
<script src="vendor/svg.min.js"></script>
<script src="src/xsp-mind.js"></script>
```

`xsp-mind.css` 已自动引入 `xsp-mind-themes.css`，内置三种主题可直接使用。

## 快速开始

```html
<div id="mind-root"><svg id="mind-svg"></svg></div>
<script>
  const app = new XSPMindJS("mind-root", "mind-svg");
  app.initflow({
    option: {
      box: { width: 140, height: 36 },
      line: { color: "#00A1E7", width: 1.2, arrow: true },
      editable: true,
      dblclickEdit: true,
      pan: true,
      zoom: true,
      // layout: "tree-right", // 或 tree-left / tree-down
      theme: "default", // default | dark | athens-blue
      onChange: (data) => console.log(data)
    },
    data: [/* JSON 节点树 */]
  });
</script>
```

本地：

```bash
npm run demo
# http://localhost:5173/
```

## 主要 API

- `initflow({ option, data })` / `setData(data)` / `importJSON(text)` / `getData()` / `toJSON()`
- `addNode(parentId, node)` / `updateNode(id, patch)` / `removeNode(id)`
- `selectNode(id)` / `clearSelection()` / `beginEdit(id)`
- `applyLayout('tree-right' | 'tree-left' | 'tree-down')` / `fitContent()` / `fitToViewport()` / `applyCanvasFit()` / `setZoom(z)` / `resetView()`
- `exportJSON()` / `exportSVG()` / `exportPNG()`
- `applyTheme('default' | 'dark' | 'athens-blue')` — 运行时切换内置主题
- `setLineStyle({ dash, animate, animateSpeed, arrow, arrowSize, ... })` — 运行时切换连线样式
- `destroy()`

常用 `option`：`editable`、`dblclickEdit`、`allowHtmlText`、`sanitizeHtml`、`layout`、`layoutGap`、`padding`、`fitMode`、`autoResize`、`pan`、`zoom`、`zoomMin`/`zoomMax`/`zoomStep`、`line.arrow`、`line.arrowSize`、`line.dash`、`line.animate`、`theme`、`onSelect`、`onChange`。

内置主题（`option.theme`）：

| 值 | 名称 | 说明 |
|----|------|------|
| `default` | 默认 | 白底节点 + 天蓝连线（`#00A1E7`） |
| `dark` | 高级黑 | 深色画布 + 青绿强调色 |
| `athens-blue` | 雅典蓝 | 浅蓝背景 + 古典深蓝描边 |

```js
// 初始化时指定
app.initflow({ option: { theme: "dark" }, data: [...] });

// 运行时切换
app.applyTheme("athens-blue");

// 查看列表
console.log(XSPMindJS.themes);
```

画布自适应：

```js
option: {
  fitMode: "expand",   // 默认：随内容扩大，至少铺满容器（fillContainer）
  // fitMode: "viewport", // 缩放到容器内完整显示，画布 100% 贴合容器
  fillContainer: true, // false 时画布仅按内容尺寸（可能小于容器）
  autoResize: true,
  canvasMin: { width: 320, height: 240 },
  fitViewportPadding: 0.92
}
```

容器需有明确高度（如 `height: 100%` / `100vh` / `flex: 1`），否则 `100%` 无法计算：

```html
<div id="mind-root" style="width:100%;height:100%;">
  <svg id="mind-svg"></svg>
</div>
```

手动：`app.fitContent()` | `app.fitToViewport()` | `app.resetView()`
```

连线动画与样式示例：

```js
option: {
  line: {
    color: "#00A1E7",
    width: 1.6,
    arrow: true,       // true | false | 'triangle' | 'open' | 'diamond' | 'circle' | 'none'
    arrowSize: 10,     // 箭头大小（像素），默认 10
    dash: [8, 6],      // true 或 [实线长, 间隔长]
    animate: "flow",   // true / 'flow' 开启流动
    animateSpeed: 1.2  // 越大越快
  }
}
// 单条连线覆盖：linecolor / linewidth / linedash / lineanimate / linearrow / linearrowsize
// 运行时：app.setLineStyle({ arrow: 'open', arrowSize: 12 })
```

箭头样式（`line.arrow` / 节点 `linearrow`）：

| 值 | 效果 |
|----|------|
| `true` / `"triangle"` | 实心三角（默认） |
| `"open"` | 空心 V 形 |
| `"diamond"` | 菱形 |
| `"circle"` | 圆点 |
| `false` / `"none"` | 无箭头 |

```js
// 全局
option: { line: { arrow: "open", arrowSize: 12 } }

// 单条连线（写在子节点上，覆盖全局）
{ text: "需求分析", linearrow: "diamond", linearrowsize: 14, items: [] }

// 查看可用样式
console.log(XSPMindJS.arrowStyles); // ['triangle', 'open', 'diamond', 'circle']
```

节点字段（连线相关）：

| 字段 | 说明 |
|------|------|
| `linestyle` | `line` / `sline` / `zline` |
| `linetext` | 连线中点文字 |
| `linecolor` | 单条连线颜色 |
| `linewidth` | 单条连线粗细 |
| `linedash` | 单条虚线样式 |
| `lineanimate` | 单条流动动画 |
| `linearrow` | 单条箭头样式（同 `line.arrow`） |
| `linearrowsize` | 单条箭头大小（像素） |

> `allowHtmlText: true` 时建议保持 `sanitizeHtml: true`（默认），见 [SECURITY.md](SECURITY.md) 与 [示例5](examples/html-safety.html)。

## 示例

在线示例入口：

- [GitHub Pages 首页](https://xsttbillng.github.io/XSP-Mind-JS/)

| # | 仓库文件 | 在线预览 | 说明 |
|---|----------|----------|------|
| — | [index.html](index.html) | [首页](https://xsttbillng.github.io/XSP-Mind-JS/) | 项目入口 |
| 目录 | [examples/index.html](examples/index.html) | [示例目录](https://xsttbillng.github.io/XSP-Mind-JS/examples/index.html) | 全部 10 个示例卡片 |
| 1 | [examples/basic.html](examples/basic.html) | [示例1](https://xsttbillng.github.io/XSP-Mind-JS/examples/basic.html) | 基础渲染 + 富节点 |
| 2 | [examples/editable.html](examples/editable.html) | [示例2](https://xsttbillng.github.io/XSP-Mind-JS/examples/editable.html) | 增删 / 编辑 / 布局 / 导入导出 JSON |
| 3 | [examples/styled-nodes.html](examples/styled-nodes.html) | [示例3](https://xsttbillng.github.io/XSP-Mind-JS/examples/styled-nodes.html) | `className` 主题（含粗线） |
| 4 | [examples/events.html](examples/events.html) | [示例4](https://xsttbillng.github.io/XSP-Mind-JS/examples/events.html) | 点击回调 |
| 5 | [examples/html-safety.html](examples/html-safety.html) | [示例5](https://xsttbillng.github.io/XSP-Mind-JS/examples/html-safety.html) | `sanitizeHtml` XSS 防护 |
| 6 | [examples/layouts.html](examples/layouts.html) | [示例6](https://xsttbillng.github.io/XSP-Mind-JS/examples/layouts.html) | 三种自动布局对比 |
| 7 | [examples/animated-lines.html](examples/animated-lines.html) | [示例7](https://xsttbillng.github.io/XSP-Mind-JS/examples/animated-lines.html) | 虚线流动动画 |
| 8 | [examples/line-styles.html](examples/line-styles.html) | [示例8](https://xsttbillng.github.io/XSP-Mind-JS/examples/line-styles.html) | 线型 + 多色连线 |
| 9 | [examples/themes.html](examples/themes.html) | [示例9](https://xsttbillng.github.io/XSP-Mind-JS/examples/themes.html) | 内置主题切换 |
| 10 | [examples/config-builder.html](examples/config-builder.html) | [示例10](https://xsttbillng.github.io/XSP-Mind-JS/examples/config-builder.html) | 可视化配置 · 生成 initflow JSON |

发布步骤见 [docs/OPENSOURCE.md](docs/OPENSOURCE.md)。

## License

[MIT](LICENSE) © WUYUANBIAO
