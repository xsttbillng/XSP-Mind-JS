(function (global) {
  const DEFAULT_OPTION = {
    box: { width: 140, height: 36 },
    line: { color: "#00A1E7", width: 1.2, arrow: true, arrowSize: 10, dash: false, animate: false, animateSpeed: 1 },
    text: { color: "#00A1E7", size: 12 },
    ismove: true,
    allowHtmlText: false,
    // 当 allowHtmlText=true 时，默认过滤 script/on* 等危险片段
    sanitizeHtml: true,
    editable: false,
    dblclickEdit: true,
    // none | tree-right | tree-left | tree-down
    layout: "none",
    layoutGap: { x: 220, y: 28 },
    padding: 40,
    // pan on blank area + wheel zoom
    pan: true,
    zoom: true,
    zoomMin: 0.4,
    zoomMax: 2.5,
    zoomStep: 0.1,
    // expand: 画布随内容扩大（可滚动）| viewport: 缩放到容器内完整显示
    fitMode: "expand",
    autoResize: true,
    canvasMin: { width: 320, height: 240 },
    fitViewportPadding: 0.92,
    /** true：画布至少铺满容器（expand 取 max(内容,容器)；viewport 用 100% 贴合） */
    fillContainer: true,
    /** 有子节点时显示折叠按钮 */
    collapsible: true,
    /** 启用快捷键（Delete / Esc / ←→ 折叠等） */
    keyboard: true,
    /** 允许点击选中（editable=false 时也可选中） */
    selectable: true,
    /** 双指捏合缩放（移动端） */
    touchZoom: true,
    onSelect: null, // (node|null) => void
    onChange: null // (data) => void
  };

  var THEME_CLASS_NAMES = ["xsp-theme-default", "xsp-theme-dark", "xsp-theme-athens"];

  var THEME_PRESETS = {
    default: {
      id: "default",
      name: "默认",
      className: "xsp-theme-default",
      option: {
        line: { color: "#00A1E7", width: 1.2 },
        text: { color: "#00A1E7", size: 12 }
      }
    },
    dark: {
      id: "dark",
      name: "高级黑",
      className: "xsp-theme-dark",
      option: {
        line: { color: "#5eead4", width: 1.3 },
        text: { color: "#94e2d5", size: 12 }
      }
    },
    "athens-blue": {
      id: "athens-blue",
      name: "雅典蓝",
      className: "xsp-theme-athens",
      option: {
        line: { color: "#1e5a8a", width: 1.4 },
        text: { color: "#1e5a8a", size: 12 }
      }
    }
  };

  var THEME_ALIASES = {
    default: "default",
    "默认": "default",
    dark: "dark",
    "高级黑": "dark",
    black: "dark",
    "athens-blue": "athens-blue",
    athens: "athens-blue",
    "雅典蓝": "athens-blue"
  };

  function resolveThemeId(name) {
    if (name == null || name === "") return "default";
    var key = String(name).trim();
    if (THEME_ALIASES[key]) return THEME_ALIASES[key];
    if (THEME_PRESETS[key]) return key;
    return "default";
  }

  function getThemePreset(name) {
    return THEME_PRESETS[resolveThemeId(name)] || THEME_PRESETS.default;
  }

  function listThemes() {
    return Object.keys(THEME_PRESETS).map(function (id) {
      var t = THEME_PRESETS[id];
      return { id: t.id, name: t.name, className: t.className };
    });
  }

  function deepMerge(base, override) {
    const output = Object.assign({}, base);
    if (!override) return output;
    Object.keys(override).forEach(function (k) {
      if (
        typeof base[k] === "object" &&
        base[k] !== null &&
        !Array.isArray(base[k]) &&
        typeof override[k] === "object" &&
        override[k] !== null &&
        !Array.isArray(override[k])
      ) {
        output[k] = deepMerge(base[k], override[k]);
      } else {
        output[k] = override[k];
      }
    });
    return output;
  }

  function cloneData(data) {
    return JSON.parse(JSON.stringify(data || []));
  }

  function sanitizeHtml(html) {
    if (html == null) return "";
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html);
    var blocked = { SCRIPT: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, LINK: 1, META: 1 };
    wrapper.querySelectorAll("*").forEach(function (node) {
      if (blocked[node.tagName]) {
        node.remove();
        return;
      }
      Array.prototype.slice.call(node.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        var val = String(attr.value || "").trim().toLowerCase();
        if (name.indexOf("on") === 0) node.removeAttribute(attr.name);
        if ((name === "href" || name === "src") && (val.indexOf("javascript:") === 0 || val.indexOf("data:text") === 0)) {
          node.removeAttribute(attr.name);
        }
        if (name === "style" && /expression|javascript:/i.test(attr.value)) {
          node.removeAttribute("style");
        }
      });
    });
    return wrapper.innerHTML;
  }

  function measureTreeSpan(node) {
    if (node && node.collapsed) return 1;
    if (!Array.isArray(node.items) || node.items.length === 0) return 1;
    var sum = 0;
    node.items.forEach(function (child) {
      sum += measureTreeSpan(child);
    });
    return Math.max(1, sum);
  }

  var ARROW_STYLES = ["triangle", "open", "diamond", "circle"];

  function normalizeArrowStyle(value) {
    if (value === false || value === "none" || value === 0) return null;
    if (value === true || value == null) return "triangle";
    var s = String(value).toLowerCase();
    if (ARROW_STYLES.indexOf(s) >= 0) return s;
    return "triangle";
  }

  function cubicBezierPoint(t, p0, p1, p2, p3) {
    var u = 1 - t;
    var uu = u * u;
    var tt = t * t;
    return {
      x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
      y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y
    };
  }

  function stripHtmlText(html) {
    if (html == null) return "";
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html);
    return wrapper.textContent || "";
  }

  function nodeMatchesQuery(node, q) {
    if (!q) return false;
    var text = stripHtmlText(node.text).toLowerCase();
    return text.indexOf(q) >= 0 || String(node.id).toLowerCase().indexOf(q) >= 0;
  }

  class XSPMindJS {
    constructor(containerId, svgId) {
      this.container = document.getElementById(containerId);
      this.svgId = svgId;
      this.svgEl = document.getElementById(svgId);
      if (!this.container) throw new Error("container #" + containerId + " not found");
      if (!this.svgEl) throw new Error("svg #" + svgId + " not found");

      this.container.classList.add("xsp-mind-root");
      this.view = { x: 0, y: 0, zoom: 1 };
      this.ensureStage();

      this.option = Object.assign({}, DEFAULT_OPTION);
      this.data = [];
      this.canvas = null;
      this.lines = [];
      this.lineTexts = [];
      this.flowingLines = [];
      this.lineFlowRaf = null;
      this.lineFlowLastTs = 0;
      this.nodeElements = new Map();
      this.nodeMeta = new Map();
      this.selectedNodeId = null;
      this.editingId = null;
      this._searchQuery = "";
      this._searchHits = [];

      this.drag = { active: false, nodeId: null, startX: 0, startY: 0, originX: 0, originY: 0, moved: false };
      this.panDrag = { active: false, startX: 0, startY: 0, originX: 0, originY: 0 };
      this.activePointers = new Map();
      this.pinchStartDist = 0;
      this.pinchStartZoom = 1;

      this.boundMove = this.onPointerMove.bind(this);
      this.boundUp = this.onPointerUp.bind(this);
      this.boundWheel = this.onWheel.bind(this);
      this.boundStageDown = this.onStagePointerDown.bind(this);
      this.boundResize = this.onContainerResize.bind(this);
      this.boundKeyDown = this.onKeyDown.bind(this);
      this.boundContainerPointerDown = this.onContainerPointerDown.bind(this);
      this.boundContainerPointerMove = this.onContainerPointerMove.bind(this);
      this.boundContainerPointerUp = this.onContainerPointerUp.bind(this);
      this.changeRaf = null;
      this.resizeObserver = null;
      this.resizeRaf = null;
      this._windowResizeFallback = false;

      this.stage.addEventListener("pointerdown", this.boundStageDown);
      this.container.addEventListener("wheel", this.boundWheel, { passive: false });
      this.container.addEventListener("pointerdown", this.boundContainerPointerDown, { capture: true });
      this.container.addEventListener("pointermove", this.boundContainerPointerMove, { capture: true });
      this.container.addEventListener("pointerup", this.boundContainerPointerUp, { capture: true });
      this.container.addEventListener("pointercancel", this.boundContainerPointerUp, { capture: true });
    }

    ensureStage() {
      var stage = this.container.querySelector(".xsp-mind-stage");
      if (!stage) {
        stage = document.createElement("div");
        stage.className = "xsp-mind-stage";
        this.container.appendChild(stage);
      }
      if (this.svgEl.parentElement !== stage) {
        stage.appendChild(this.svgEl);
      }
      this.stage = stage;
      this.applyViewTransform();
    }

    initflow(payload) {
      var rawOption = Object.assign({}, (payload && payload.option) || {});
      var themeId = resolveThemeId(rawOption.theme != null ? rawOption.theme : "default");
      var theme = getThemePreset(themeId);
      var themeOption = theme.option ? JSON.parse(JSON.stringify(theme.option)) : {};
      delete rawOption.theme;
      this.option = deepMerge(DEFAULT_OPTION, deepMerge(themeOption, rawOption));
      this.option.theme = theme.id;
      this.applyThemeClass(theme.className);
      this.data = Array.isArray(payload && payload.data) ? payload.data : [];
      this.mountCanvas();
      if (this.option.layout && this.option.layout !== "none") {
        this.applyLayout(this.option.layout);
      }
      this.render();
      this.setupAutoResize();
      this.setupKeyboard();
      this.syncInteractionClass();
      return this;
    }

    setupKeyboard() {
      this.teardownKeyboard();
      if (this.option.keyboard === false) return;
      document.addEventListener("keydown", this.boundKeyDown);
    }

    teardownKeyboard() {
      document.removeEventListener("keydown", this.boundKeyDown);
    }

    syncInteractionClass() {
      if (!this.container) return;
      if (this.option.pan || this.option.zoom || this.option.touchZoom !== false) {
        this.container.classList.add("xsp-mind-touch-pan");
      } else {
        this.container.classList.remove("xsp-mind-touch-pan");
      }
    }

    applyThemeClass(className) {
      if (!this.container) return;
      var self = this;
      THEME_CLASS_NAMES.forEach(function (c) {
        self.container.classList.remove(c);
      });
      if (className) this.container.classList.add(className);
    }

    applyTheme(themeName) {
      var theme = getThemePreset(themeName);
      this.option.theme = theme.id;
      this.applyThemeClass(theme.className);
      if (theme.option && theme.option.line) {
        this.option.line = deepMerge(this.option.line || {}, theme.option.line);
      }
      if (theme.option && theme.option.text) {
        this.option.text = deepMerge(this.option.text || {}, theme.option.text);
      }
      if (this.canvas) this.redrawAllLines();
      if (this.option.fitMode === "viewport") {
        this.fitToViewport();
      } else if (this.canvas) {
        this.fitContent();
      }
      return this;
    }

    setData(data) {
      this.data = Array.isArray(data) ? data : [];
      this.clearSelection();
      if (this.option.layout && this.option.layout !== "none") {
        this.applyLayout(this.option.layout);
      }
      this.render();
      this.notifyChangeSoon();
      return this;
    }

    importJSON(text) {
      var parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON root must be an array");
      }
      return this.setData(parsed);
    }

    getData() {
      return cloneData(this.data);
    }

    toJSON(pretty) {
      return JSON.stringify(this.data, null, pretty === false ? undefined : 2);
    }

    destroy() {
      document.removeEventListener("pointermove", this.boundMove);
      document.removeEventListener("pointerup", this.boundUp);
      this.teardownKeyboard();
      this.container.removeEventListener("wheel", this.boundWheel);
      this.container.removeEventListener("pointerdown", this.boundContainerPointerDown, { capture: true });
      this.container.removeEventListener("pointermove", this.boundContainerPointerMove, { capture: true });
      this.container.removeEventListener("pointerup", this.boundContainerPointerUp, { capture: true });
      this.container.removeEventListener("pointercancel", this.boundContainerPointerUp, { capture: true });
      this.stage.removeEventListener("pointerdown", this.boundStageDown);
      this.teardownAutoResize();
      this.stopLineFlowLoop();
      this.clearRender();
      if (this.canvas) this.canvas.clear();
      this.selectedNodeId = null;
    }

    mountCanvas() {
      if (this.canvas) return;
      if (!global.SVG) {
        throw new Error("SVG.js is required. Please load svg.js before xsp-mind.js");
      }
      this.canvas = global.SVG("#" + this.svgId);
      if (!this.canvas) throw new Error("svg #" + this.svgId + " not found");
    }

    render() {
      this.clearRender();
      this.walkNodes(this.data, null);
      this.drawConnections(this.data, null);
      this.ensureLineFlowLoop();
      this.applyCanvasFit();
      this.applyViewTransform();
    }

    clearRender() {
      this.stopLineFlowLoop();
      this.stage.querySelectorAll(".xsp-mind-node").forEach(function (n) {
        n.remove();
      });
      if (this.canvas) this.canvas.clear();
      this.lines = [];
      this.lineTexts = [];
      this.nodeElements.clear();
      this.nodeMeta.clear();
      this.editingId = null;
    }

    walkNodes(list) {
      var self = this;
      (list || []).forEach(function (node) {
        self.drawNode(node);
        if (!self.isNodeCollapsed(node) && Array.isArray(node.items) && node.items.length > 0) {
          self.walkNodes(node.items);
        }
      });
    }

    drawConnections(list, parent) {
      var self = this;
      (list || []).forEach(function (node) {
        if (parent) self.drawLine(parent, node);
        if (!self.isNodeCollapsed(node) && Array.isArray(node.items) && node.items.length > 0) {
          self.drawConnections(node.items, node);
        }
      });
    }

    isNodeCollapsed(node) {
      return !!(node && node.collapsed);
    }

    hasChildren(node) {
      return !!(node && Array.isArray(node.items) && node.items.length > 0);
    }

    toggleCollapse(nodeId) {
      var node = this.findNodeById(this.data, nodeId);
      if (!node || !this.hasChildren(node)) return this;
      node.collapsed = !node.collapsed;
      this.afterStructureChange();
      return this;
    }

    setCollapsed(nodeId, collapsed) {
      var node = this.findNodeById(this.data, nodeId);
      if (!node || !this.hasChildren(node)) return this;
      node.collapsed = !!collapsed;
      this.afterStructureChange();
      return this;
    }

    expandAll() {
      var self = this;
      function walk(list) {
        (list || []).forEach(function (n) {
          if (n.collapsed) n.collapsed = false;
          if (n.items) walk(n.items);
        });
      }
      walk(this.data);
      this.afterStructureChange();
      return this;
    }

    collapseAll() {
      var self = this;
      function walk(list) {
        (list || []).forEach(function (n) {
          if (self.hasChildren(n)) n.collapsed = true;
          if (n.items) walk(n.items);
        });
      }
      walk(this.data);
      this.afterStructureChange();
      return this;
    }

    afterStructureChange() {
      if (this.option.layout && this.option.layout !== "none") {
        this.applyLayout(this.option.layout);
      }
      this.render();
      this.reapplySearchHighlight();
      this.notifyChangeSoon();
    }

    searchNodes(query) {
      var q = String(query == null ? "" : query).trim().toLowerCase();
      if (!q) return [];
      var hits = [];
      var self = this;
      function walk(list) {
        (list || []).forEach(function (n) {
          if (nodeMatchesQuery(n, q)) hits.push(n);
          if (!self.isNodeCollapsed(n) && n.items) walk(n.items);
        });
      }
      walk(this.data);
      this._searchQuery = q;
      this._searchHits = hits;
      return hits.slice();
    }

    clearSearchHighlight() {
      this._searchQuery = "";
      this._searchHits = [];
      this.container.querySelectorAll(".xsp-mind-search-hit").forEach(function (el) {
        el.classList.remove("xsp-mind-search-hit");
      });
      return this;
    }

    highlightSearch(query) {
      this.clearSearchHighlight();
      var hits = this.searchNodes(query);
      var self = this;
      hits.forEach(function (n) {
        var el = self.nodeElements.get(String(n.id));
        if (el) el.classList.add("xsp-mind-search-hit");
      });
      return hits;
    }

    reapplySearchHighlight() {
      if (!this._searchQuery) return;
      var q = this._searchQuery;
      this._searchQuery = "";
      this.highlightSearch(q);
    }

    focusNode(nodeId, options) {
      options = options || {};
      var id = String(nodeId);
      var ancestors = this.getAncestorChain(id);
      var self = this;
      ancestors.forEach(function (aid) {
        if (aid === id) return;
        var p = self.findNodeById(self.data, aid);
        if (p && p.collapsed) p.collapsed = false;
      });
      if (ancestors.length > 1) {
        if (this.option.layout && this.option.layout !== "none") {
          this.applyLayout(this.option.layout);
        }
        this.render();
      }
      this.selectNode(id);
      var meta = this.nodeMeta.get(id);
      var el = this.nodeElements.get(id);
      if (!meta || !el) return this;

      if (options.highlight !== false) {
        el.classList.add("xsp-mind-focus-pulse");
        setTimeout(function () {
          if (el.isConnected) el.classList.remove("xsp-mind-focus-pulse");
        }, 900);
      }

      if (options.center !== false) {
        var w = Number(meta.width != null ? meta.width : this.option.box.width);
        var h = Number(meta.height != null ? meta.height : this.option.box.height);
        var nx = Number(meta.node.x || 0) + w / 2;
        var ny = Number(meta.node.y || 0) + h / 2;
        var cs = this.getContainerClientSize();
        var z = this.view.zoom || 1;
        this.view.x = cs.width / 2 - nx * z;
        this.view.y = cs.height / 2 - ny * z;
        this.applyViewTransform();
      }
      return this;
    }

    getAncestorChain(nodeId) {
      var chain = [];
      var self = this;
      function find(list, path) {
        for (var i = 0; i < (list || []).length; i++) {
          var n = list[i];
          var next = path.concat([String(n.id)]);
          if (String(n.id) === String(nodeId)) {
            chain = next;
            return true;
          }
          if (n.items && find(n.items, next)) return true;
        }
        return false;
      }
      find(this.data, []);
      return chain;
    }

    clientToStage(clientX, clientY) {
      var rect = this.stage.getBoundingClientRect();
      var z = this.view.zoom || 1;
      return {
        x: (clientX - rect.left) / z,
        y: (clientY - rect.top) / z
      };
    }

    drawNode(node) {
      var width = Number(node.width != null ? node.width : this.option.box.width);
      var height = Number(node.height != null ? node.height : this.option.box.height);
      var x = Number(node.x || 0);
      var y = Number(node.y || 0);
      var id = String(node.id);
      var self = this;

      var el = document.createElement("div");
      el.className = "xsp-mind-node";
      if (node.className) {
        String(node.className)
          .split(/\s+/)
          .filter(Boolean)
          .forEach(function (c) {
            el.classList.add(c);
          });
      }
      el.dataset.id = id;
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.width = width + "px";
      el.style.height = height + "px";
      el.style.lineHeight = this.option.allowHtmlText ? "normal" : height + "px";
      el.dataset.draggable = String(!!this.option.ismove);
      if (this.isNodeCollapsed(node)) {
        el.classList.add("xsp-mind-collapsed-node");
      }

      this.fillNodeContent(el, node);

      if (this.option.collapsible !== false && this.hasChildren(node)) {
        var collapsed = this.isNodeCollapsed(node);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "xsp-mind-collapse-btn";
        btn.setAttribute("aria-label", collapsed ? "展开子节点" : "折叠子节点");
        btn.textContent = collapsed ? "+" : "−";
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          e.preventDefault();
          self.toggleCollapse(id);
        });
        btn.addEventListener("pointerdown", function (e) {
          e.stopPropagation();
        });
        el.classList.add("xsp-mind-has-children");
        el.appendChild(btn);
      }

      var canSelect = this.option.selectable !== false || this.option.editable;
      if (canSelect) {
        el.addEventListener("click", function (e) {
          if (e.target.closest && e.target.closest(".xsp-mind-collapse-btn")) return;
          e.stopPropagation();
          if (self.drag.active || self.drag.moved) {
            self.drag.moved = false;
            return;
          }
          if (self.editingId) return;
          self.selectNode(id);
        });
      }

      if (this.option.editable && this.option.dblclickEdit && !this.option.allowHtmlText) {
        el.addEventListener("dblclick", function (e) {
          e.stopPropagation();
          e.preventDefault();
          self.beginEdit(id);
        });
      }

      if (this.option.ismove) {
        el.addEventListener("pointerdown", function (e) {
          e.stopPropagation();
          self.onNodePointerDown(e, node);
        });
      }

      this.stage.appendChild(el);
      this.nodeElements.set(id, el);
      this.nodeMeta.set(id, { node: node, width: width, height: height });

      if (this.selectedNodeId != null && id === this.selectedNodeId) {
        el.classList.add("xsp-mind-selected");
      }
      if (this._searchQuery && nodeMatchesQuery(node, this._searchQuery)) {
        el.classList.add("xsp-mind-search-hit");
      }
    }

    fillNodeContent(el, node) {
      var text = node.text || "";
      if (this.option.allowHtmlText) {
        if (this.option.sanitizeHtml !== false) {
          text = sanitizeHtml(text);
        }
        el.innerHTML = text;
      } else {
        el.textContent = text;
      }
    }

    selectNode(id) {
      if (id == null) {
        this.clearSelection();
        return;
      }
      this.selectedNodeId = String(id);
      this.container.querySelectorAll(".xsp-mind-selected").forEach(function (el) {
        el.classList.remove("xsp-mind-selected");
      });
      var el = this.nodeElements.get(this.selectedNodeId);
      if (el) el.classList.add("xsp-mind-selected");

      var meta = this.nodeMeta.get(this.selectedNodeId);
      if (typeof this.option.onSelect === "function") {
        this.option.onSelect(meta ? meta.node : null);
      }
    }

    clearSelection() {
      this.selectedNodeId = null;
      this.container.querySelectorAll(".xsp-mind-selected").forEach(function (el) {
        el.classList.remove("xsp-mind-selected");
      });
      if (typeof this.option.onSelect === "function") {
        this.option.onSelect(null);
      }
    }

    beginEdit(id) {
      var self = this;
      var sid = String(id);
      var meta = this.nodeMeta.get(sid);
      var el = this.nodeElements.get(sid);
      if (!meta || !el || this.editingId) return;
      if (this.option.allowHtmlText) return;

      this.editingId = sid;
      this.selectNode(sid);
      var input = document.createElement("input");
      input.type = "text";
      input.className = "xsp-mind-edit-input";
      input.value = meta.node.text || "";
      el.textContent = "";
      el.appendChild(input);
      input.focus();
      input.select();

      function commit() {
        if (self.editingId !== sid) return;
        meta.node.text = input.value;
        self.editingId = null;
        self.render();
        self.notifyChangeSoon();
      }

      function cancel() {
        if (self.editingId !== sid) return;
        self.editingId = null;
        self.render();
      }

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      });
      input.addEventListener("blur", commit);
      input.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
      });
    }

    getAnchor(parent, child) {
      var pw = Number(parent.width != null ? parent.width : this.option.box.width);
      var ph = Number(parent.height != null ? parent.height : this.option.box.height);
      var cw = Number(child.width != null ? child.width : this.option.box.width);
      var ch = Number(child.height != null ? child.height : this.option.box.height);

      var px = Number(parent.x || 0);
      var py = Number(parent.y || 0);
      var cx = Number(child.x || 0);
      var cy = Number(child.y || 0);
      var parentCx = px + pw / 2;
      var parentCy = py + ph / 2;
      var childCx = cx + cw / 2;
      var childCy = cy + ch / 2;
      var dx = childCx - parentCx;
      var dy = childCy - parentCy;

      // 垂直方向为主：上下连接（tree-down / 纵向布局）
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy >= 0) {
          return { x1: parentCx, y1: py + ph, x2: childCx, y2: cy, axis: "v" };
        }
        return { x1: parentCx, y1: py, x2: childCx, y2: cy + ch, axis: "v" };
      }

      // 水平方向为主：左右连接（tree-right / tree-left）
      if (dx >= 0) {
        return { x1: px + pw, y1: parentCy, x2: cx, y2: childCy, axis: "h" };
      }
      return { x1: px, y1: parentCy, x2: cx + cw, y2: childCy, axis: "h" };
    }

    getSlineSpec(a) {
      var p0 = { x: a.x1, y: a.y1 };
      var p3 = { x: a.x2, y: a.y2 };
      var p1;
      var p2;
      if (a.axis === "v") {
        var cy = (a.y1 + a.y2) / 2;
        p1 = { x: a.x1, y: cy };
        p2 = { x: a.x2, y: cy };
      } else {
        var cx = (a.x1 + a.x2) / 2;
        p1 = { x: cx, y: a.y1 };
        p2 = { x: cx, y: a.y2 };
      }
      return { p0: p0, p1: p1, p2: p2, p3: p3 };
    }

    getZlinePoints(a) {
      if (a.axis === "v") {
        var midY = a.y1 + (a.y2 - a.y1) / 2;
        return [
          { x: a.x1, y: a.y1 },
          { x: a.x1, y: midY },
          { x: a.x2, y: midY },
          { x: a.x2, y: a.y2 }
        ];
      }
      var midX = a.x1 + (a.x2 - a.x1) / 2;
      return [
        { x: a.x1, y: a.y1 },
        { x: midX, y: a.y1 },
        { x: midX, y: a.y2 },
        { x: a.x2, y: a.y2 }
      ];
    }

    buildLinePath(style, a) {
      if (style === "sline") {
        var spec = this.getSlineSpec(a);
        return (
          "M" +
          spec.p0.x +
          " " +
          spec.p0.y +
          " C" +
          spec.p1.x +
          " " +
          spec.p1.y +
          ", " +
          spec.p2.x +
          " " +
          spec.p2.y +
          ", " +
          spec.p3.x +
          " " +
          spec.p3.y
        );
      }
      if (style === "zline") {
        return this.getZlinePoints(a)
          .map(function (p) {
            return p.x + "," + p.y;
          })
          .join(" ");
      }
      return null;
    }

    getLineEndAngle(style, a) {
      if (style === "sline") {
        var spec = this.getSlineSpec(a);
        var near = cubicBezierPoint(0.95, spec.p0, spec.p1, spec.p2, spec.p3);
        var dx = spec.p3.x - near.x;
        var dy = spec.p3.y - near.y;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
          dx = spec.p3.x - spec.p2.x;
          dy = spec.p3.y - spec.p2.y;
        }
        return (Math.atan2(dy, dx) * 180) / Math.PI;
      }
      if (style === "zline") {
        var pts = this.getZlinePoints(a);
        var prev = pts[pts.length - 2];
        return (Math.atan2(a.y2 - prev.y, a.x2 - prev.x) * 180) / Math.PI;
      }
      return (Math.atan2(a.y2 - a.y1, a.x2 - a.x1) * 180) / Math.PI;
    }

    arrowUnitVectors(angleDeg) {
      var rad = (angleDeg * Math.PI) / 180;
      return {
        cos: Math.cos(rad),
        sin: Math.sin(rad),
        perpX: -Math.sin(rad),
        perpY: Math.cos(rad)
      };
    }

    drawArrowHead(x, y, angleDeg, color, style, size) {
      var len = Math.max(6, Number(size) || 10);
      var half = len * 0.35;
      var u = this.arrowUnitVectors(angleDeg);
      var back = len * 0.92;
      var bx = x - u.cos * back;
      var by = y - u.sin * back;

      if (style === "circle") {
        var r = half * 0.9;
        return this.canvas.circle(r * 2).fill(color).center(x - u.cos * r, y - u.sin * r);
      }

      if (style === "open") {
        var lx = bx + u.perpX * half;
        var ly = by + u.perpY * half;
        var rx = bx - u.perpX * half;
        var ry = by - u.perpY * half;
        return this.canvas
          .polyline(x + "," + y + " " + lx + "," + ly + " " + rx + "," + ry)
          .fill("none")
          .stroke({ color: color, width: 1.8, linecap: "round", linejoin: "round" });
      }

      if (style === "diamond") {
        var mx = x - u.cos * (back * 0.5);
        var my = y - u.sin * (back * 0.5);
        return this.canvas
          .polygon(
            x +
              "," +
              y +
              " " +
              (mx + u.perpX * half) +
              "," +
              (my + u.perpY * half) +
              " " +
              bx +
              "," +
              by +
              " " +
              (mx - u.perpX * half) +
              "," +
              (my - u.perpY * half)
          )
          .fill(color);
      }

      var tlx = bx + u.perpX * half;
      var tly = by + u.perpY * half;
      var trx = bx - u.perpX * half;
      var try_ = by - u.perpY * half;
      return this.canvas.polygon(x + "," + y + " " + tlx + "," + tly + " " + trx + "," + try_).fill(color);
    }

    resolveArrowStyle(child) {
      if (child && child.linearrow != null) return normalizeArrowStyle(child.linearrow);
      var lineOpt = this.option.line || {};
      return normalizeArrowStyle(lineOpt.arrow);
    }

    resolveArrowSize(child) {
      if (child && child.linearrowsize != null) return Number(child.linearrowsize);
      var lineOpt = this.option.line || {};
      return Number(lineOpt.arrowSize != null ? lineOpt.arrowSize : 10);
    }

    drawLine(parent, child) {
      var a = this.getAnchor(parent, child);
      var style = child.linestyle || "line";
      var color = this.resolveLineColor(child);
      var width =
        child.linewidth != null
          ? Number(child.linewidth)
          : Number((this.option.line && this.option.line.width) || 1.2);
      var stroke = {
        color: color,
        width: width,
        linecap: "round",
        linejoin: "round"
      };
      var dashResolved = this.resolveLineDash(child);
      if (dashResolved) {
        var dashArr = this.normalizeDashArray(dashResolved);
        stroke.dasharray = dashArr.join(",");
      }

      var line;
      if (style === "sline") {
        line = this.canvas.path(this.buildLinePath("sline", a)).fill("none").stroke(stroke);
      } else if (style === "zline") {
        line = this.canvas.polyline(this.buildLinePath("zline", a)).fill("none").stroke(stroke);
      } else {
        line = this.canvas.line(a.x1, a.y1, a.x2, a.y2).fill("none").stroke(stroke);
      }

      var arrowStyle = this.resolveArrowStyle(child);
      var arrowEl = null;
      if (arrowStyle && line) {
        var angle = this.getLineEndAngle(style, a);
        var arrowSize = this.resolveArrowSize(child);
        arrowEl = this.drawArrowHead(a.x2, a.y2, angle, color, arrowStyle, arrowSize);
      }

      this.applyLineVisual(line, child);
      this.lines.push({ id: parent.id + "->" + child.id, line: line, arrow: arrowEl });
      this.drawLineText(child.linetext, a.x1, a.y1, a.x2, a.y2, child);
    }

    resolveLineColor(child) {
      if (child && child.linecolor) return String(child.linecolor);
      return (this.option.line && this.option.line.color) || "#00A1E7";
    }

    resolveLineDash(child) {
      var lineOpt = this.option.line || {};
      var dash = child && child.linedash != null ? child.linedash : lineOpt.dash;
      var animate = this.resolveLineAnimate(child);
      if (animate && !dash) dash = true;
      return dash;
    }

    resolveLineAnimate(child) {
      var lineOpt = this.option.line || {};
      if (child && child.lineanimate != null) return child.lineanimate;
      return lineOpt.animate;
    }

    normalizeDashArray(dash) {
      if (dash === true) return [8, 6];
      if (Array.isArray(dash) && dash.length >= 2) {
        return [Number(dash[0]) || 8, Number(dash[1]) || 6];
      }
      return [8, 6];
    }

    getLineDom(svgLine) {
      if (!svgLine) return null;
      if (typeof svgLine.node === "function") return svgLine.node();
      if (svgLine.node) return svgLine.node;
      return null;
    }

    applyLineDashToDom(el, arr, animate, speed) {
      if (!el) return;
      var dashStr = arr[0] + " " + arr[1];
      el.setAttribute("stroke-dasharray", dashStr);
      el.style.strokeDasharray = dashStr;
      el.classList.remove("xsp-mind-line-flow");
      el.style.animation = "";
      if (animate) {
        this.flowingLines.push({
          el: el,
          total: arr[0] + arr[1],
          offset: 0,
          speed: speed
        });
      } else {
        el.setAttribute("stroke-dashoffset", "0");
        el.style.strokeDashoffset = "0";
      }
    }

    stopLineFlowLoop() {
      if (this.lineFlowRaf != null) {
        cancelAnimationFrame(this.lineFlowRaf);
        this.lineFlowRaf = null;
      }
      this.flowingLines = [];
    }

    ensureLineFlowLoop() {
      var self = this;
      if (self.lineFlowRaf != null) return;
      if (!self.flowingLines.length) return;
      self.lineFlowLastTs = performance.now();

      function tick(now) {
        if (!self.flowingLines.length) {
          self.lineFlowRaf = null;
          return;
        }
        var dt = Math.min(0.05, (now - self.lineFlowLastTs) / 1000);
        self.lineFlowLastTs = now;
        var alive = [];
        self.flowingLines.forEach(function (item) {
          var el = item.el;
          if (!el || !el.isConnected) return;
          var rate = 42 * item.speed;
          item.offset = (item.offset + rate * dt) % item.total;
          var off = -item.offset;
          el.setAttribute("stroke-dashoffset", String(off));
          el.style.strokeDashoffset = String(off);
          alive.push(item);
        });
        self.flowingLines = alive;
        self.lineFlowRaf = alive.length ? requestAnimationFrame(tick) : null;
      }

      self.lineFlowRaf = requestAnimationFrame(tick);
    }

    applyLineVisual(svgLine, child) {
      var dash = this.resolveLineDash(child);
      var animate = this.resolveLineAnimate(child);
      if (!dash && !animate) return;

      var arr = this.normalizeDashArray(dash);
      var el = this.getLineDom(svgLine);
      if (!el) return;

      var speed = Number((this.option.line && this.option.line.animateSpeed) || 1);
      if (!isFinite(speed) || speed <= 0) speed = 1;
      var dashCsv = arr.join(",");

      if (svgLine.attr) {
        try {
          svgLine.attr("stroke-dasharray", dashCsv);
          if (!animate) svgLine.attr("stroke-dashoffset", 0);
        } catch (e) {}
      }

      this.applyLineDashToDom(el, arr, !!animate, speed);
    }

    setLineStyle(patch) {
      this.option.line = deepMerge(this.option.line || {}, patch || {});
      this.redrawAllLines();
      return this;
    }

    drawLineText(text, x1, y1, x2, y2, child) {
      if (!text) return;
      var tx = x1 + (x2 - x1) / 2;
      var ty = y1 + (y2 - y1) / 2;
      var fillColor = child && child.linecolor ? child.linecolor : this.option.text.color;
      var label = this.canvas
        .text(String(text))
        .move(tx, ty)
        .fill(fillColor)
        .font({
          family: "Helvetica, Arial, sans-serif",
          size: this.option.text.size,
          anchor: "middle"
        });
      this.lineTexts.push(label);
    }

    onNodePointerDown(event, node) {
      if (this.editingId) return;
      if (event.button != null && event.button !== 0) return;
      var pt = this.clientToStage(event.clientX, event.clientY);
      this.drag.active = true;
      this.drag.nodeId = String(node.id);
      this.drag.startX = pt.x;
      this.drag.startY = pt.y;
      this.drag.originX = Number(node.x || 0);
      this.drag.originY = Number(node.y || 0);
      this.drag.moved = false;
      document.addEventListener("pointermove", this.boundMove);
      document.addEventListener("pointerup", this.boundUp);
    }

    onStagePointerDown(event) {
      if (!this.option.pan) return;
      if (event.target.closest && event.target.closest(".xsp-mind-node")) return;
      if (event.button != null && event.button !== 0) return;
      this.panDrag.active = true;
      this.panDrag.startX = event.clientX;
      this.panDrag.startY = event.clientY;
      this.panDrag.originX = this.view.x;
      this.panDrag.originY = this.view.y;
      this.container.classList.add("xsp-mind-panning");
      document.addEventListener("pointermove", this.boundMove);
      document.addEventListener("pointerup", this.boundUp);
    }

    onContainerPointerDown(event) {
      this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.activePointers.size === 2 && this.option.touchZoom !== false && this.option.zoom) {
        this.pinchStartDist = this.getPointerDistance();
        this.pinchStartZoom = this.view.zoom || 1;
        this.drag.active = false;
        this.panDrag.active = false;
      }
    }

    onContainerPointerMove(event) {
      if (!this.activePointers.has(event.pointerId)) return;
      this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.activePointers.size >= 2 && this.option.touchZoom !== false && this.option.zoom) {
        var dist = this.getPointerDistance();
        if (this.pinchStartDist > 0) {
          var ratio = dist / this.pinchStartDist;
          this.setZoom(this.pinchStartZoom * ratio);
        }
        event.preventDefault();
      }
    }

    onContainerPointerUp(event) {
      this.activePointers.delete(event.pointerId);
      if (this.activePointers.size < 2) {
        this.pinchStartDist = 0;
      }
    }

    getPointerDistance() {
      var pts = Array.from(this.activePointers.values());
      if (pts.length < 2) return 0;
      return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    }

    onKeyDown(event) {
      if (this.option.keyboard === false) return;
      var target = event.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Escape") {
        if (this.editingId) {
          var editEl = this.nodeElements.get(this.editingId);
          if (editEl) {
            var meta = this.nodeMeta.get(this.editingId);
            this.editingId = null;
            if (meta) this.fillNodeContent(editEl, meta.node);
          }
        }
        this.clearSelection();
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        this.option.editable &&
        this.selectedNodeId
      ) {
        event.preventDefault();
        this.removeNode(this.selectedNodeId);
        return;
      }

      if (!this.selectedNodeId) return;
      var node = this.findNodeById(this.data, this.selectedNodeId);
      if (!node) return;

      if (event.key === "ArrowLeft" && this.hasChildren(node)) {
        event.preventDefault();
        if (!node.collapsed) this.setCollapsed(node.id, true);
        return;
      }
      if (event.key === "ArrowRight" && this.hasChildren(node)) {
        event.preventDefault();
        if (node.collapsed) this.setCollapsed(node.id, false);
        return;
      }
      if (
        (event.key === "Enter" || event.key === "F2") &&
        this.option.editable &&
        !this.option.allowHtmlText
      ) {
        event.preventDefault();
        this.beginEdit(this.selectedNodeId);
      }
    }

    onPointerMove(event) {
      if (this.activePointers.size >= 2 && this.option.touchZoom !== false && this.option.zoom) {
        return;
      }

      if (this.drag.active) {
        var id = this.drag.nodeId;
        var meta = this.nodeMeta.get(id);
        var el = this.nodeElements.get(id);
        if (!meta || !el) return;
        var pt = this.clientToStage(event.clientX, event.clientY);
        var dx = pt.x - this.drag.startX;
        var dy = pt.y - this.drag.startY;
        if (!this.drag.moved && Math.hypot(dx, dy) > 3) this.drag.moved = true;
        var nextX = Math.round(this.drag.originX + dx);
        var nextY = Math.round(this.drag.originY + dy);
        meta.node.x = nextX;
        meta.node.y = nextY;
        el.style.left = nextX + "px";
        el.style.top = nextY + "px";
        this.redrawAllLines();
        this.notifyChangeSoon();
        return;
      }

      if (this.panDrag.active) {
        this.view.x = this.panDrag.originX + (event.clientX - this.panDrag.startX);
        this.view.y = this.panDrag.originY + (event.clientY - this.panDrag.startY);
        this.applyViewTransform();
      }
    }

    onPointerUp() {
      var nodeDragged = this.drag.moved;
      this.drag.active = false;
      this.drag.nodeId = null;
      this.drag.moved = false;
      if (this.panDrag.active) {
        this.panDrag.active = false;
        this.container.classList.remove("xsp-mind-panning");
      }
      document.removeEventListener("pointermove", this.boundMove);
      document.removeEventListener("pointerup", this.boundUp);
      if (nodeDragged && this.option.fitMode !== "viewport") {
        this.fitContent();
      }
      this.notifyChangeSoon();
    }

    onWheel(event) {
      if (!this.option.zoom) return;
      event.preventDefault();
      var step = this.option.zoomStep || 0.1;
      var delta = event.deltaY > 0 ? -step : step;
      var next = Math.min(
        this.option.zoomMax || 2.5,
        Math.max(this.option.zoomMin || 0.4, (this.view.zoom || 1) + delta)
      );
      this.view.zoom = Math.round(next * 100) / 100;
      this.applyViewTransform();
    }

    applyViewTransform() {
      if (!this.stage) return;
      if (!this.view) this.view = { x: 0, y: 0, zoom: 1 };
      var z = this.view.zoom || 1;
      this.stage.style.transform =
        "translate(" + this.view.x + "px," + this.view.y + "px) scale(" + z + ")";
    }

    setZoom(z) {
      this.view.zoom = Math.min(
        this.option.zoomMax || 2.5,
        Math.max(this.option.zoomMin || 0.4, z)
      );
      this.applyViewTransform();
      return this;
    }

    resetView() {
      if (this.option.fitMode === "viewport") {
        return this.fitToViewport();
      }
      this.view.x = 0;
      this.view.y = 0;
      this.view.zoom = 1;
      this.applyViewTransform();
      return this;
    }

    syncFitModeClass() {
      if (!this.container) return;
      if (this.option.fitMode === "viewport") {
        this.container.classList.add("xsp-mind-fit-viewport");
      } else {
        this.container.classList.remove("xsp-mind-fit-viewport");
      }
    }

    setupAutoResize() {
      this.teardownAutoResize();
      this.syncFitModeClass();
      this.syncInteractionClass();
      if (this.option.autoResize === false) return;
      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(this.boundResize);
        this.resizeObserver.observe(this.container);
      } else if (global.addEventListener) {
        global.addEventListener("resize", this.boundResize);
        this._windowResizeFallback = true;
      }
    }

    teardownAutoResize() {
      if (this.resizeRaf != null) {
        cancelAnimationFrame(this.resizeRaf);
        this.resizeRaf = null;
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      if (this._windowResizeFallback && global.removeEventListener) {
        global.removeEventListener("resize", this.boundResize);
        this._windowResizeFallback = false;
      }
    }

    onContainerResize() {
      if (this.resizeRaf != null) return;
      var self = this;
      this.resizeRaf = requestAnimationFrame(function () {
        self.resizeRaf = null;
        if (self.option.fitMode === "viewport") {
          self.fitToViewport();
        } else {
          self.fitContent();
        }
      });
    }

    getContentBounds() {
      var pad = Number(this.option.padding != null ? this.option.padding : 40);
      var box = { minX: Infinity, minY: Infinity, maxX: 0, maxY: 0 };
      this.collectBounds(this.data, box);
      if (!isFinite(box.minX)) {
        box = { minX: 0, minY: 0, maxX: 800, maxY: 600 };
      }
      return { box: box, pad: pad };
    }

    applyCanvasFit() {
      if (this.option.fitMode === "viewport") {
        return this.fitToViewport();
      }
      return this.fitContent();
    }

    getContainerClientSize() {
      if (!this.container) {
        return { width: 320, height: 240 };
      }
      var rect = this.container.getBoundingClientRect();
      return {
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height)
      };
    }

    syncStageCanvasSize(width, height) {
      var w = Math.max(1, Math.ceil(width));
      var h = Math.max(1, Math.ceil(height));
      if (!this.stage || !this.svgEl) return { width: w, height: h };

      var fillContainer = this.option.fillContainer !== false;
      var viewport = this.option.fitMode === "viewport";
      var usePercent = fillContainer && viewport;

      if (usePercent) {
        var cs = this.getContainerClientSize();
        w = cs.width;
        h = cs.height;
      } else if (fillContainer) {
        var cs2 = this.getContainerClientSize();
        w = Math.max(w, cs2.width);
        h = Math.max(h, cs2.height);
      }

      if (usePercent) {
        this.stage.style.width = "100%";
        this.stage.style.height = "100%";
      } else {
        this.stage.style.width = w + "px";
        this.stage.style.height = h + "px";
      }
      this.stage.style.minWidth = "0";
      this.stage.style.minHeight = "0";

      this.svgEl.setAttribute("width", String(w));
      this.svgEl.setAttribute("height", String(h));
      if (usePercent) {
        this.svgEl.style.width = "100%";
        this.svgEl.style.height = "100%";
      } else {
        this.svgEl.style.width = w + "px";
        this.svgEl.style.height = h + "px";
      }
      if (this.canvas && this.canvas.size) {
        try {
          this.canvas.size(w, h);
        } catch (e) {}
      }
      return { width: w, height: h };
    }

    syncNodeDomFromData() {
      var self = this;
      this.nodeMeta.forEach(function (meta, id) {
        var el = self.nodeElements.get(id);
        var node = meta.node;
        if (!el || !node) return;
        el.style.left = Number(node.x || 0) + "px";
        el.style.top = Number(node.y || 0) + "px";
      });
    }

    fitToViewport() {
      var bounds = this.getContentBounds();
      var box = bounds.box;
      var pad = bounds.pad;
      var cs = this.getContainerClientSize();
      var availW = cs.width;
      var availH = cs.height;

      this.syncStageCanvasSize(availW, availH);

      var contentW = Math.max(1, box.maxX - box.minX + pad * 2);
      var contentH = Math.max(1, box.maxY - box.minY + pad * 2);
      var inset = Number(this.option.fitViewportPadding != null ? this.option.fitViewportPadding : 0.92);
      var zoomMax = this.option.zoomMax || 2.5;
      var zoomMin = this.option.zoomMin || 0.4;
      var zoom = Math.min(availW / contentW, availH / contentH, zoomMax) * inset;
      zoom = Math.max(zoom, zoomMin);
      zoom = Math.round(zoom * 100) / 100;

      var centerX = (box.minX + box.maxX) / 2;
      var centerY = (box.minY + box.maxY) / 2;
      this.view.zoom = zoom;
      this.view.x = availW / 2 - centerX * zoom;
      this.view.y = availH / 2 - centerY * zoom;
      this.applyViewTransform();
      return { width: availW, height: availH, zoom: zoom };
    }

    redrawAllLines() {
      if (!this.canvas) return;
      this.stopLineFlowLoop();
      this.canvas.clear();
      this.lines = [];
      this.lineTexts = [];
      this.drawConnections(this.data, null);
      this.ensureLineFlowLoop();
    }

    notifyChangeSoon() {
      if (typeof this.option.onChange !== "function") return;
      if (this.changeRaf != null) return;
      var self = this;
      this.changeRaf = requestAnimationFrame(function () {
        self.changeRaf = null;
        self.option.onChange(self.getData());
      });
    }

    findNodeById(list, id) {
      var sid = String(id);
      if (!Array.isArray(list)) return null;
      for (var i = 0; i < list.length; i++) {
        var n = list[i];
        if (n && String(n.id) === sid) return n;
        if (n && Array.isArray(n.items) && n.items.length > 0) {
          var hit = this.findNodeById(n.items, sid);
          if (hit) return hit;
        }
      }
      return null;
    }

    removeNodeById(list, id) {
      var sid = String(id);
      if (!Array.isArray(list)) return;
      for (var i = list.length - 1; i >= 0; i--) {
        var n = list[i];
        if (n && String(n.id) === sid) {
          list.splice(i, 1);
          continue;
        }
        if (n && Array.isArray(n.items) && n.items.length > 0) {
          this.removeNodeById(n.items, sid);
        }
      }
    }

    collectBounds(list, box) {
      var self = this;
      (list || []).forEach(function (node) {
        var w = Number(node.width != null ? node.width : self.option.box.width);
        var h = Number(node.height != null ? node.height : self.option.box.height);
        var x = Number(node.x || 0);
        var y = Number(node.y || 0);
        box.minX = Math.min(box.minX, x);
        box.minY = Math.min(box.minY, y);
        box.maxX = Math.max(box.maxX, x + w);
        box.maxY = Math.max(box.maxY, y + h);
        if (Array.isArray(node.items) && node.items.length && !self.isNodeCollapsed(node)) {
          self.collectBounds(node.items, box);
        }
      });
    }

    fitContent() {
      var bounds = this.getContentBounds();
      var box = bounds.box;
      var pad = bounds.pad;
      var minW = (this.option.canvasMin && this.option.canvasMin.width) || 320;
      var minH = (this.option.canvasMin && this.option.canvasMin.height) || 240;
      var width = Math.max(minW, Math.ceil(box.maxX - box.minX + pad * 2));
      var height = Math.max(minH, Math.ceil(box.maxY - box.minY + pad * 2));
      return this.syncStageCanvasSize(width, height);
    }

    applyLayout(mode) {
      if (mode === "tree-right") this.layoutTreeRight();
      else if (mode === "tree-left") this.layoutTreeLeft();
      else if (mode === "tree-down") this.layoutTreeDown();
      if (mode) this.option.layout = mode;
      return this;
    }

    layoutTreeRight() {
      var self = this;
      var gapX = (this.option.layoutGap && this.option.layoutGap.x) || 220;
      var gapY = (this.option.layoutGap && this.option.layoutGap.y) || 28;
      var startX = this.option.padding || 40;
      var cursorY = this.option.padding || 40;

      function place(node, depth, yStart) {
        var h = Number(node.height != null ? node.height : self.option.box.height);
        var span = measureTreeSpan(node);
        var blockH = span * (h + gapY) - gapY;
        node.x = startX + depth * gapX;
        node.y = Math.round(yStart + (blockH - h) / 2);
        if (!Array.isArray(node.items) || !node.items.length) return;
        var childY = yStart;
        node.items.forEach(function (child) {
          var cSpan = measureTreeSpan(child);
          var cH = Number(child.height != null ? child.height : self.option.box.height);
          var cBlock = cSpan * (cH + gapY) - gapY;
          place(child, depth + 1, childY);
          childY += cBlock + gapY;
        });
      }

      (this.data || []).forEach(function (root) {
        var span = measureTreeSpan(root);
        var h = Number(root.height != null ? root.height : self.option.box.height);
        var blockH = span * (h + gapY) - gapY;
        place(root, 0, cursorY);
        cursorY += blockH + gapY * 2;
      });
    }

    layoutTreeLeft() {
      var self = this;
      var gapX = (this.option.layoutGap && this.option.layoutGap.x) || 220;
      var gapY = (this.option.layoutGap && this.option.layoutGap.y) || 28;
      var pad = this.option.padding || 40;
      var cursorY = pad;

      function maxDepth(node, depth) {
        var md = depth;
        (node.items || []).forEach(function (child) {
          md = Math.max(md, maxDepth(child, depth + 1));
        });
        return md;
      }

      var forestMaxDepth = 0;
      (this.data || []).forEach(function (root) {
        forestMaxDepth = Math.max(forestMaxDepth, maxDepth(root, 0));
      });
      var startX = pad + forestMaxDepth * gapX;

      function place(node, depth, yStart) {
        var h = Number(node.height != null ? node.height : self.option.box.height);
        var span = measureTreeSpan(node);
        var blockH = span * (h + gapY) - gapY;
        node.x = startX - depth * gapX;
        node.y = Math.round(yStart + (blockH - h) / 2);
        if (!Array.isArray(node.items) || !node.items.length) return;
        var childY = yStart;
        node.items.forEach(function (child) {
          var cSpan = measureTreeSpan(child);
          var cH = Number(child.height != null ? child.height : self.option.box.height);
          var cBlock = cSpan * (cH + gapY) - gapY;
          place(child, depth + 1, childY);
          childY += cBlock + gapY;
        });
      }

      (this.data || []).forEach(function (root) {
        var span = measureTreeSpan(root);
        var h = Number(root.height != null ? root.height : self.option.box.height);
        var blockH = span * (h + gapY) - gapY;
        place(root, 0, cursorY);
        cursorY += blockH + gapY * 2;
      });
    }

    layoutTreeDown() {
      var self = this;
      var gapX = (this.option.layoutGap && this.option.layoutGap.x) || 180;
      var gapY = (this.option.layoutGap && this.option.layoutGap.y) || 80;
      var startY = this.option.padding || 40;
      var cursorX = this.option.padding || 40;

      function place(node, depth, xStart) {
        var w = Number(node.width != null ? node.width : self.option.box.width);
        var h = Number(node.height != null ? node.height : self.option.box.height);
        var span = measureTreeSpan(node);
        var blockW = span * (w + gapX) - gapX;
        node.x = Math.round(xStart + (blockW - w) / 2);
        node.y = startY + depth * gapY;
        if (!Array.isArray(node.items) || !node.items.length) return;
        var childX = xStart;
        node.items.forEach(function (child) {
          var cSpan = measureTreeSpan(child);
          var cW = Number(child.width != null ? child.width : self.option.box.width);
          var cBlock = cSpan * (cW + gapX) - gapX;
          place(child, depth + 1, childX);
          childX += cBlock + gapX;
        });
      }

      (this.data || []).forEach(function (root) {
        var w = Number(root.width != null ? root.width : self.option.box.width);
        var span = measureTreeSpan(root);
        var blockW = span * (w + gapX) - gapX;
        place(root, 0, cursorX);
        cursorX += blockW + gapX * 2;
      });
    }

    addNode(parentId, node) {
      var newNode = Object.assign({}, node || {});
      newNode.id = newNode.id != null ? String(newNode.id) : String(Date.now());
      newNode.text = newNode.text != null ? String(newNode.text) : "新节点";
      newNode.width = Number(newNode.width != null ? newNode.width : this.option.box.width);
      newNode.height = Number(newNode.height != null ? newNode.height : this.option.box.height);
      newNode.linestyle = newNode.linestyle || "sline";
      newNode.items = Array.isArray(newNode.items) ? newNode.items : [];

      if (parentId == null) {
        if (newNode.x == null) newNode.x = 80;
        if (newNode.y == null) newNode.y = 80;
        this.data.push(newNode);
      } else {
        var parent = this.findNodeById(this.data, parentId);
        if (!parent) throw new Error("parentId=" + parentId + " not found");
        if (newNode.x == null) newNode.x = Number(parent.x || 0) + this.option.box.width * 1.8;
        if (newNode.y == null) {
          var len = Array.isArray(parent.items) ? parent.items.length : 0;
          newNode.y = Number(parent.y || 0) + (this.option.box.height + 18) * (len + 1);
        }
        if (!Array.isArray(parent.items)) parent.items = [];
        parent.items.push(newNode);
      }

      if (this.option.layout && this.option.layout !== "none") {
        this.applyLayout(this.option.layout);
      }
      this.render();
      this.notifyChangeSoon();
      return newNode;
    }

    updateNode(nodeId, patch) {
      var node = this.findNodeById(this.data, nodeId);
      if (!node) throw new Error("nodeId=" + nodeId + " not found");
      patch = patch || {};
      ["text", "className", "linestyle", "linetext", "width", "height", "x", "y", "collapsed"].forEach(function (k) {
        if (patch[k] !== undefined) node[k] = patch[k];
      });
      this.render();
      this.notifyChangeSoon();
      return node;
    }

    removeNode(nodeId) {
      var removedSelected =
        this.selectedNodeId != null && String(this.selectedNodeId) === String(nodeId);
      this.removeNodeById(this.data, nodeId);
      if (removedSelected) {
        this.clearSelection();
      }
      if (this.option.layout && this.option.layout !== "none") {
        this.applyLayout(this.option.layout);
      }
      this.render();
      this.notifyChangeSoon();
    }

    exportJSON(filename) {
      var text = this.toJSON(true);
      this.downloadText(filename || "xsp-mind.json", text, "application/json");
      return text;
    }

    exportSVG(filename) {
      var clone = this.svgEl.cloneNode(true);
      if (!clone.getAttribute("xmlns")) {
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      var text = new XMLSerializer().serializeToString(clone);
      this.downloadText(filename || "xsp-mind.svg", text, "image/svg+xml");
      return text;
    }

    exportPNG(filename) {
      var self = this;
      var size = this.fitContent();
      var canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      var svgText = new XMLSerializer().serializeToString(this.svgEl);
      var blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var img = new Image();

      return new Promise(function (resolve, reject) {
        img.onload = function () {
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          // draw node boxes (plain text approximation)
          self.nodeMeta.forEach(function (meta) {
            var n = meta.node;
            var w = meta.width;
            var h = meta.height;
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#d9d9d9";
            ctx.lineWidth = 1;
            roundRect(ctx, n.x, n.y, w, h, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#333333";
            ctx.font = "13px Arial, sans-serif";
            ctx.textBaseline = "middle";
            var label = String(n.text || "").replace(/<[^>]+>/g, "");
            ctx.fillText(label, n.x + 10, n.y + h / 2, w - 20);
          });
          canvas.toBlob(function (b) {
            if (!b) {
              reject(new Error("exportPNG failed"));
              return;
            }
            self.downloadBlob(filename || "xsp-mind.png", b);
            resolve(b);
          }, "image/png");
        };
        img.onerror = function (e) {
          URL.revokeObjectURL(url);
          reject(e);
        };
        img.src = url;
      });
    }

    downloadText(filename, text, mime) {
      this.downloadBlob(filename, new Blob([text], { type: mime || "text/plain" }));
    }

    downloadBlob(filename, blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
      }, 1000);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  global.XSPMindJS = XSPMindJS;
  global.XSPMindJS.sanitizeHtml = sanitizeHtml;
  global.XSPMindJS.themes = listThemes();
  global.XSPMindJS.getTheme = getThemePreset;
  global.XSPMindJS.resolveThemeId = resolveThemeId;
  global.XSPMindJS.arrowStyles = ARROW_STYLES.slice();
  global.XSPMindJS.normalizeArrowStyle = normalizeArrowStyle;
})(window);
