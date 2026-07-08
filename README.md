# XSP-Mind-JS

轻量级 **JSON 驱动** 的流程图 / 思维图 **展示库**。  
适合官网、文档站、标签页、能力地图等「固定版式 + 富节点」场景。

> **不是完整在线编辑器**；默认手动坐标，可选 `tree-right` 自动布局。

Author / Copyright: **WUYUANBIAO** · GitHub: [xsttbillng/XSP-Mind-JS](https://github.com/xsttbillng/XSP-Mind-JS) · License: [MIT](LICENSE)

## 能力一览

| 类别 | 能力 |
|------|------|
| 渲染 | 树形 JSON、线型 `line/sline/zline`、箭头、连线文字 |
| 节点 | `x/y/width/height`、`className`、可选 HTML 文本 |
| 交互 | 拖拽、点击选中、双击改文字、空白处平移、滚轮缩放 |
| 编辑 API | `addNode` / `updateNode` / `removeNode` / `getData` / `toJSON` |
| 布局 | `layout: "tree-right"` 或 `applyLayout('tree-right')` |
| 导出 | `exportJSON` / `exportSVG` / `exportPNG` |
| 视口 | `fitContent` / `setZoom` / `resetView` |

## 依赖

- [@svgdotjs/svg.js](https://svgjs.dev/) `^3.2`

```html
<link rel="stylesheet" href="src/xsp-mind.css" />
<script src="vendor/svg.min.js"></script>
<script src="src/xsp-mind.js"></script>
```

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
      // layout: "tree-right", // 可选自动布局
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

- `initflow({ option, data })` / `setData(data)` / `getData()` / `toJSON()`
- `addNode(parentId, node)` / `updateNode(id, patch)` / `removeNode(id)`
- `selectNode(id)` / `clearSelection()` / `beginEdit(id)`
- `applyLayout('tree-right')` / `fitContent()` / `setZoom(z)` / `resetView()`
- `exportJSON()` / `exportSVG()` / `exportPNG()`
- `destroy()`

常用 `option`：`editable`、`dblclickEdit`、`allowHtmlText`、`layout`、`pan`、`zoom`、`line.arrow`、`onSelect`、`onChange`。

> `allowHtmlText: true` 仅用于可信内容，见 [SECURITY.md](SECURITY.md)。

## 示例

在线示例入口：

- [GitHub Pages 首页](https://xsttbillng.github.io/XSP-Mind-JS/)

| # | 仓库文件 | 在线预览 | 说明 |
|---|----------|----------|------|
| — | [index.html](index.html) | [首页](https://xsttbillng.github.io/XSP-Mind-JS/) | 示例入口 |
| 1 | [examples/index.html](examples/index.html) | [示例1](https://xsttbillng.github.io/XSP-Mind-JS/examples/index.html) | 基础渲染 + 富节点 |
| 2 | [examples/editable.html](examples/editable.html) | [示例2](https://xsttbillng.github.io/XSP-Mind-JS/examples/editable.html) | 增删 / 双击编辑 / 布局 / 导出 |
| 3 | [examples/styled-nodes.html](examples/styled-nodes.html) | [示例3](https://xsttbillng.github.io/XSP-Mind-JS/examples/styled-nodes.html) | `className` 主题（含粗线） |
| 4 | [examples/events.html](examples/events.html) | [示例4](https://xsttbillng.github.io/XSP-Mind-JS/examples/events.html) | 点击回调 |

发布步骤见 [docs/OPENSOURCE.md](docs/OPENSOURCE.md)。

## License

[MIT](LICENSE) © WUYUANBIAO
