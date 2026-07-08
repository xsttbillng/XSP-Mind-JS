/**
 * TypeScript declarations for XSP-Mind-JS (UMD global).
 * Peer: @svgdotjs/svg.js
 */

export interface XSPMindBoxOption {
  width: number;
  height: number;
}

export interface XSPMindLineOption {
  color: string;
  width: number;
  arrow?: boolean;
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
  onSelect?: (node: XSPMindNode | null) => void;
  onChange?: (data: XSPMindNode[]) => void;
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
  applyLayout(mode: string): this;
  setZoom(z: number): this;
  resetView(): this;
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
    };
  }
  const XSPMindJS: {
    new (containerId: string, svgId: string): XSPMindJS;
    sanitizeHtml(html: string): string;
  };
}
