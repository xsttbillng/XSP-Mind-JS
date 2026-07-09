# Changelog

## [0.3.2] - 2026-07-09

### Added

- 额外连线 `links`：支持多条线汇入同一节点（`from`/`to` + 单条样式）
- API：`setLinks` / `getLinks` / `addLink` / `removeLinks`
- `importJSON` / `toJSON` 支持 `{ data, links }` 格式
- 示例 12：`examples/links.html`

## [0.3.1] - 2026-07-09

### Added

- 单元测试（`npm test`，8 个用例：锚点 / 箭头角度 / 折叠 / 搜索等）
- GitHub Actions CI（语法检查 + 测试 + 构建）
- 构建脚本 `npm run build` → `dist/`（`.js` / `.min.js` / `.esm.js` / `.cjs.js` / css / d.ts）
- `package.json` `exports` 字段，支持 ESM / CJS 引用
- 配置生成器补充 `fillContainer` / `collapsible` / `keyboard` 等选项

## [0.3.0] - 2026-07-09

### Added

- 子树折叠：`collapsed` 字段、`toggleCollapse` / `setCollapsed` / `expandAll` / `collapseAll`
- 节点搜索：`searchNodes` / `highlightSearch` / `clearSearchHighlight` / `focusNode`
- 快捷键：`Esc` 取消选中、`Delete` 删除节点、`←`/`→` 折叠展开、`Enter`/`F2` 编辑
- 触摸优化：`touch-action: none`、双指捏合缩放（`touchZoom`）
- 示例 11：效率增强（搜索 / 折叠 / 快捷键）
- `CHANGELOG.md`

### Changed

- `fillContainer` 默认 true，expand 模式画布至少铺满容器；viewport 模式 SVG 使用 100% 宽高
- `selectable` 默认 true，非编辑模式也可点击选中
- 节点拖拽结束后仅在 expand 模式重算画布，避免 viewport 模式误重置视图
- 自绘箭头（世界坐标），修复曲线箭头方向与位置
- `line.arrow` 支持 `triangle` / `open` / `diamond` / `circle` / `none`
- 更新 `OPENSOURCE.md`、README 示例表

## [0.2.0] - 2026-07

### Added

- 内置主题（default / dark / athens-blue）
- 布局 tree-right / tree-left / tree-down
- 连线虚线流动动画、多色与多线型
- 画布 fitMode（expand / viewport）、autoResize
- 示例 5～10（安全、布局、动画、线型、主题、配置生成器）
- TypeScript 声明 `xsp-mind.d.ts`

## [0.1.0] - 初始

- JSON 驱动渲染、基础编辑、导出 JSON/SVG/PNG
