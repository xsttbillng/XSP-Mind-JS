/**
 * TypeScript declarations for XSP-Mind-JS (UMD global).
 * Peer: @svgdotjs/svg.js
 */

export interface XSPMindBoxOption {
  width: number;
  height: number;
}

export type XSPMindArrowStyle = "triangle" | "open" | "diamond" | "circle" | "none";

export interface XSPMindLineOption {
  color: string;
  width: number;
  /** true / triangle 实心三角；false / none 无箭头；open | diamond | circle */
  arrow?: boolean | XSPMindArrowStyle;
  /** 箭头大小（像素），默认 10 */
  arrowSize?: number;
  /** false 实线；true 或 [8,6] 虚线 */
  dash?: boolean | number[];
  /** true / 'flow' 开启虚线流动 */
  animate?: boolean | "flow";
  /** 流动速度倍率，越大越快 */
  animateSpeed?: number;
}

export interface XSPMindTextOption {
  color: string;
  size: number;
}

export interface XSPMindLayoutGap {
  x: number;
  y: number;
}

export interface XSPMindCanvasMin {
  width: number;
  height: number;
}

export interface XSPMindNode {
  text?: string;
  id: string | number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  className?: string;
  linestyle?: "line" | "sline" | "zline" | string;
  linetext?: string;
  /** 单条连线颜色，覆盖全局 line.color */
  linecolor?: string;
  /** 单条连线粗细，覆盖全局 line.width */
  linewidth?: number;
  /** 单条连线虚线，覆盖全局 line.dash */
  linedash?: boolean | number[];
  /** 单条连线流动动画，覆盖全局 line.animate */
  lineanimate?: boolean | "flow";
  /** 单条连线箭头样式，覆盖全局 line.arrow */
  linearrow?: boolean | XSPMindArrowStyle;
  /** 单条连线箭头大小，覆盖全局 line.arrowSize */
  linearrowsize?: number;
  /** 折叠子树，隐藏下级节点与连线 */
  collapsed?: boolean;
  items?: XSPMindNode[];
  [key: string]: unknown;
}

export interface XSPMindOption {
  box?: Partial<XSPMindBoxOption>;
  line?: Partial<XSPMindLineOption>;
  text?: Partial<XSPMindTextOption>;
  ismove?: boolean;
  allowHtmlText?: boolean;
  /** 当 allowHtmlText=true 时，默认 true，过滤 script/on* 等 */
  sanitizeHtml?: boolean;
  editable?: boolean;
  dblclickEdit?: boolean;
  layout?: "none" | "tree-right" | "tree-left" | "tree-down" | string;
  layoutGap?: Partial<XSPMindLayoutGap>;
  padding?: number;
  pan?: boolean;
  zoom?: boolean;
  zoomMin?: number;
  zoomMax?: number;
  zoomStep?: number;
  /** expand: 画布随内容扩大 | viewport: 缩放到容器内显示 */
  fitMode?: "expand" | "viewport";
  /** 监听容器尺寸变化并重新适配 */
  autoResize?: boolean;
  canvasMin?: Partial<XSPMindCanvasMin>;
  fitViewportPadding?: number;
  /** true（默认）：画布至少铺满容器；viewport 模式下 stage/svg 使用 100% 宽高 */
  fillContainer?: boolean;
  /** 有子节点时显示折叠按钮 */
  collapsible?: boolean;
  /** 启用快捷键 Delete/Esc/←→/Enter 等 */
  keyboard?: boolean;
  /** 允许点击选中（editable=false 时也可） */
  selectable?: boolean;
  /** 双指捏合缩放 */
  touchZoom?: boolean;
  /** default | dark | athens-blue（或中文：默认 / 高级黑 / 雅典蓝） */
  theme?: string;
  onSelect?: (node: XSPMindNode | null) => void;
  onChange?: (data: XSPMindNode[]) => void;
}

export interface XSPMindThemeInfo {
  id: string;
  name: string;
  className: string;
}

export interface XSPMindThemePreset extends XSPMindThemeInfo {
  option?: Partial<Pick<XSPMindOption, "line" | "text">>;
}

export interface XSPMindInitPayload {
  option?: XSPMindOption;
  data?: XSPMindNode[];
}

export declare class XSPMindJS {
  constructor(containerId: string, svgId: string);
  option: XSPMindOption;
  data: XSPMindNode[];
  initflow(payload: XSPMindInitPayload): this;
  setData(data: XSPMindNode[]): this;
  importJSON(text: string): this;
  getData(): XSPMindNode[];
  toJSON(pretty?: boolean): string;
  destroy(): void;
  addNode(parentId: string | number | null, node?: Partial<XSPMindNode>): XSPMindNode;
  updateNode(nodeId: string | number, patch: Partial<XSPMindNode>): XSPMindNode;
  removeNode(nodeId: string | number): void;
  selectNode(id: string | null): void;
  clearSelection(): void;
  beginEdit(id: string | number): void;
  redrawAllLines(): void;
  setLineStyle(patch: Partial<XSPMindLineOption>): this;
  fitContent(): { width: number; height: number };
  fitToViewport(): { width: number; height: number; zoom: number };
  applyCanvasFit(): { width: number; height: number } | { width: number; height: number; zoom: number };
  applyLayout(mode: string): this;
  setZoom(z: number): this;
  resetView(): this;
  applyTheme(themeName: string): this;
  toggleCollapse(nodeId: string | number): this;
  setCollapsed(nodeId: string | number, collapsed: boolean): this;
  expandAll(): this;
  collapseAll(): this;
  searchNodes(query: string): XSPMindNode[];
  highlightSearch(query: string): XSPMindNode[];
  clearSearchHighlight(): this;
  focusNode(nodeId: string | number, options?: { center?: boolean; highlight?: boolean }): this;
  exportJSON(filename?: string): string;
  exportSVG(filename?: string): string;
  exportPNG(filename?: string): Promise<Blob>;
}

export as namespace XSPMindJSNS;
export {};

declare global {
  interface Window {
    XSPMindJS: typeof XSPMindJS & {
      sanitizeHtml(html: string): string;
      themes: XSPMindThemeInfo[];
      getTheme(name: string): XSPMindThemePreset;
      resolveThemeId(name: string): string;
      arrowStyles: XSPMindArrowStyle[];
      normalizeArrowStyle(value: unknown): XSPMindArrowStyle | null;
    };
  }
  const XSPMindJS: {
    new (containerId: string, svgId: string): XSPMindJS;
    sanitizeHtml(html: string): string;
    themes: XSPMindThemeInfo[];
    getTheme(name: string): XSPMindThemePreset;
    resolveThemeId(name: string): string;
    arrowStyles: XSPMindArrowStyle[];
    normalizeArrowStyle(value: unknown): XSPMindArrowStyle | null;
  };
}
