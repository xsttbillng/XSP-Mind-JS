import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function mockSvgFactory(win) {
  function chain() {
    const api = {
      fill: () => api,
      stroke: () => api,
      attr: () => api,
      marker: () => api,
      add: () => api,
      move: () => api,
      center: () => api,
      font: () => api,
      node: null
    };
    return api;
  }
  function SVG() {
    return {
      size: () => {},
      clear: () => {},
      path: () => chain(),
      line: () => chain(),
      polyline: () => chain(),
      polygon: () => chain(),
      group: () => chain(),
      circle: () => chain(),
      text: () => chain(),
      marker: () => ({ ref: () => {}, size: () => {}, attr: () => {}, node: null })
    };
  }
  return SVG;
}

export function loadXSPMind() {
  const win = new Window();
  const doc = win.document;
  doc.body.innerHTML = '<div id="mind-root-test"><svg id="mind-svg-test"></svg></div>';

  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const prevSvg = globalThis.SVG;

  globalThis.window = win;
  globalThis.document = doc;
  const svg = mockSvgFactory(win);
  win.SVG = svg;
  globalThis.SVG = svg;
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
  }

  const code = readFileSync(join(root, "src/xsp-mind.js"), "utf8");
  const body = code.replace(/^\(function \(global\) \{/, "").replace(/\}\)\([^)]+\);\s*$/, "");
  const fn = new Function("global", body + "\nreturn global.XSPMindJS;");
  const lib = fn(win);

  function restore() {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
    globalThis.SVG = prevSvg;
  }

  return { win, XSPMindJS: lib, restore };
}
