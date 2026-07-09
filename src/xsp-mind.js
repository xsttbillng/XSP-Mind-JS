(function (global) {
  const DEFAULT_OPTION = {
    box: { width: 140, height: 36 },
    line: { color: "#00A1E7", width: 1.2, arrow: true, dash: false, animate: false, animateSpeed: 1 },
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
    if (!Array.isArray(node.items) || node.items.length === 0) return 1;
    var sum = 0;
    node.items.forEach(function (child) {
      sum += measureTreeSpan(child);
    });
    return Math.max(1, sum);
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
      this.arrowMarker = null;
      this.arrowMarkers = new Map();
      this.flowingLines = [];
      this.lineFlowRaf = null;
      this.lineFlowLastTs = 0;
      this.nodeElements = new Map();
      this.nodeMeta = new Map();
      this.selectedNodeId = null;
      this.editingId = null;

      this.drag = { active: false, nodeId: null, startX: 0, startY: 0, originX: 0, originY: 0, moved: false };
      this.panDrag = { active: false, startX: 0, startY: 0, originX: 0, originY: 0 };

      this.boundMove = this.onPointerMove.bind(this);
      this.boundUp = this.onPointerUp.bind(this);
      this.boundWheel = this.onWheel.bind(this);
      this.boundStageDown = this.onStagePointerDown.bind(this);
      this.boundResize = this.onContainerResize.bind(this);
      this.changeRaf = null;
      this.resizeObserver = null;
      this.resizeRaf = null;
      this._windowResizeFallback = false;

      this.stage.addEventListener("pointerdown", this.boundStageDown);
      this.container.addEventListener("wheel", this.boundWheel, { passive: false });
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
      return this;
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
      this.clearArrowMarkers();
      this.ensureArrowMarker();
      if (this.canvas) this.redrawAllLines();
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
      this.container.removeEventListener("wheel", this.boundWheel);
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
      this.ensureArrowMarker();
    }

    ensureArrowMarker() {
      var color = (this.option.line && this.option.line.color) || "#00A1E7";
      this.arrowMarker = this.getArrowMarker(color);
    }

    getArrowMarker(color) {
      if (!this.canvas) return null;
      var key = color || (this.option.line && this.option.line.color) || "#00A1E7";
      if (this.arrowMarkers && this.arrowMarkers.has(key)) {
        return this.arrowMarkers.get(key);
      }
      if (!this.arrowMarkers) this.arrowMarkers = new Map();
      try {
        var marker = this.canvas.marker(10, 7, function (add) {
          add.polygon("0,0 10,3.5 0,7").fill(key);
        });
        marker.ref(10, 3.5);
        marker.size(10, 7);
        this.arrowMarkers.set(key, marker);
        return marker;
      } catch (e) {
        return null;
      }
    }

    clearArrowMarkers() {
      this.arrowMarker = null;
      this.arrowMarkers = new Map();
    }

    render() {
      this.clearRender();
      this.ensureArrowMarker();
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
      this.clearArrowMarkers();
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
        if (Array.isArray(node.items) && node.items.length > 0) {
          self.walkNodes(node.items);
        }
      });
    }

    drawConnections(list, parent) {
      var self = this;
      (list || []).forEach(function (node) {
        if (parent) self.drawLine(parent, node);
        if (Array.isArray(node.items) && node.items.length > 0) {
          self.drawConnections(node.items, node);
        }
      });
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

      this.fillNodeContent(el, node);

      if (this.option.editable) {
        el.addEventListener("click", function (e) {
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
        var next = input.value;
        self.editingId = null;
        meta.node.text = next;
        self.fillNodeContent(el, meta.node);
        self.notifyChangeSoon();
      }

      function cancel() {
        if (self.editingId !== sid) return;
        self.editingId = null;
        self.fillNodeContent(el, meta.node);
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

      var x1 = parent.x + pw;
      var y1 = parent.y + ph / 2;
      var x2 = child.x;
      var y2 = child.y + ch / 2;

      var parentCenterX = parent.x + pw / 2;
      var inHorizontalRange =
        parentCenterX > child.x - pw && parentCenterX < child.x + cw + pw;

      if (inHorizontalRange) {
        x1 = parent.x + pw / 2;
        y1 = parent.y + ph / 2;
        x2 = child.x + cw / 2;
        y2 = child.y + ch / 2;
      } else if (parent.x > child.x) {
        x1 = parent.x;
        y1 = parent.y + ph / 2;
        x2 = child.x + cw;
        y2 = child.y + ch / 2;
      }

      return { x1: x1, y1: y1, x2: x2, y2: y2 };
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
        var cx1 = (a.x1 + a.x2) / 2;
        var path = "M" + a.x1 + " " + a.y1 + " C" + cx1 + " " + a.y1 + ", " + cx1 + " " + a.y2 + ", " + a.x2 + " " + a.y2;
        line = this.canvas.path(path).fill("none").stroke(stroke);
      } else if (style === "zline") {
        var midX = a.x1 + (a.x2 - a.x1) / 2;
        var points = a.x1 + "," + a.y1 + " " + midX + "," + a.y1 + " " + midX + "," + a.y2 + " " + a.x2 + "," + a.y2;
        line = this.canvas.polyline(points).fill("none").stroke(stroke);
      } else {
        line = this.canvas.line(a.x1, a.y1, a.x2, a.y2).fill("none").stroke(stroke);
      }

      if (this.option.line.arrow !== false && line && line.marker) {
        var marker = this.getArrowMarker(color);
        if (marker) {
          try {
            line.marker("end", marker);
          } catch (e) {}
        }
      }

      this.applyLineVisual(line, child);
      this.lines.push({ id: parent.id + "->" + child.id, line: line });
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
      this.ensureArrowMarker();
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

    onPointerMove(event) {
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
      this.drag.active = false;
      this.drag.nodeId = null;
      if (this.panDrag.active) {
        this.panDrag.active = false;
        this.container.classList.remove("xsp-mind-panning");
      }
      document.removeEventListener("pointermove", this.boundMove);
      document.removeEventListener("pointerup", this.boundUp);
      this.fitContent();
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

    fitToViewport() {
      var bounds = this.getContentBounds();
      var box = bounds.box;
      var pad = bounds.pad;
      var minW = (this.option.canvasMin && this.option.canvasMin.width) || 320;
      var minH = (this.option.canvasMin && this.option.canvasMin.height) || 240;
      var width = Math.max(minW, Math.ceil(box.maxX + pad));
      var height = Math.max(minH, Math.ceil(box.maxY + pad));

      this.svgEl.setAttribute("width", String(width));
      this.svgEl.setAttribute("height", String(height));
      this.svgEl.style.width = "";
      this.svgEl.style.height = "";
      this.stage.style.width = width + "px";
      this.stage.style.height = height + "px";
      if (this.canvas && this.canvas.size) {
        try {
          this.canvas.size(width, height);
        } catch (e) {}
      }

      var rect = this.container.getBoundingClientRect();
      var availW = rect.width || 1;
      var availH = rect.height || 1;
      var inset = Number(this.option.fitViewportPadding != null ? this.option.fitViewportPadding : 0.92);
      var contentW = Math.max(1, box.maxX - box.minX + pad * 2);
      var contentH = Math.max(1, box.maxY - box.minY + pad * 2);
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
      return { width: width, height: height, zoom: zoom };
    }

    redrawAllLines() {
      if (!this.canvas) return;
      this.stopLineFlowLoop();
      this.canvas.clear();
      this.clearArrowMarkers();
      this.ensureArrowMarker();
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
        if (Array.isArray(node.items) && node.items.length) {
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
      var width = Math.max(minW, Math.ceil(box.maxX + pad));
      var height = Math.max(minH, Math.ceil(box.maxY + pad));
      this.svgEl.setAttribute("width", String(width));
      this.svgEl.setAttribute("height", String(height));
      this.svgEl.style.width = "";
      this.svgEl.style.height = "";
      this.stage.style.width = width + "px";
      this.stage.style.height = height + "px";
      if (this.canvas && this.canvas.size) {
        try {
          this.canvas.size(width, height);
        } catch (e) {}
      }
      return { width: width, height: height };
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
      ["text", "className", "linestyle", "linetext", "width", "height", "x", "y"].forEach(function (k) {
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
})(window);
