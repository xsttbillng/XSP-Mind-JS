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
  items?: XSPMindNode[];
  [key: string]: unknown;
}

export interface XSPMindOption {
  box?: Partial<XSPMindBoxOption>;
  line?: Partial<XSPMindLineOption>;
  text?: Partial<XSPMindTextOption>;
  ismove?: boolean;
  allowHtmlText?: boolean;
  editable?: boolean;
  dblclickEdit?: boolean;
  layout?: "none" | "tree-right" | string;
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
    XSPMindJS: typeof XSPMindJS;
  }
  const XSPMindJS: {
    new (containerId: string, svgId: string): XSPMindJS;
  };
}
