import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadXSPMind } from "./helpers.js";

describe("XSPMindJS instance", () => {
  it("getAnchor uses horizontal anchors for tree-right", () => {
    const { XSPMindJS } = loadXSPMind();
    const app = new XSPMindJS("mind-root-test", "mind-svg-test");
    app.option.box = { width: 100, height: 40 };
    const parent = { x: 0, y: 0, width: 100, height: 40 };
    const child = { x: 200, y: 80, width: 100, height: 40 };
    const a = app.getAnchor(parent, child);
    assert.equal(a.x1, 100);
    assert.equal(a.y1, 20);
    assert.equal(a.x2, 200);
    assert.equal(a.y2, 100);
    assert.equal(a.axis, "h");
  });

  it("getLineEndAngle for straight line matches segment", () => {
    const { XSPMindJS } = loadXSPMind();
    const app = new XSPMindJS("mind-root-test", "mind-svg-test");
    const a = { x1: 100, y1: 20, x2: 200, y2: 100, axis: "h" };
    const angle = app.getLineEndAngle("line", a);
    const expected = (Math.atan2(80, 100) * 180) / Math.PI;
    assert.ok(Math.abs(angle - expected) < 0.01);
  });

  it("collapse hides descendants in walk render count", () => {
    const { XSPMindJS } = loadXSPMind();
    const app = new XSPMindJS("mind-root-test", "mind-svg-test");
    app.initflow({
      option: { layout: "none", collapsible: true },
      data: [
        {
          text: "root",
          id: "root",
          x: 10,
          y: 10,
          collapsed: true,
          items: [{ text: "child", id: "c1", x: 200, y: 10, items: [] }]
        }
      ]
    });
    assert.equal(app.nodeElements.size, 1);
    app.toggleCollapse("root");
    assert.equal(app.nodeElements.size, 2);
  });

  it("searchNodes finds nested text", () => {
    const { XSPMindJS } = loadXSPMind();
    const app = new XSPMindJS("mind-root-test", "mind-svg-test");
    app.data = [
      {
        text: "A",
        id: "a",
        items: [{ text: "架构", id: "b", items: [] }]
      }
    ];
    const hits = app.searchNodes("架构");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "b");
  });

  it("links draw extra converge lines", () => {
    const { XSPMindJS } = loadXSPMind();
    const app = new XSPMindJS("mind-root-test", "mind-svg-test");
    app.initflow({
      option: { layout: "none" },
      data: [
        {
          text: "root",
          id: "root",
          x: 0,
          y: 0,
          items: [
            { text: "a", id: "a", x: 100, y: 0, items: [] },
            { text: "b", id: "b", x: 100, y: 80, items: [] },
            { text: "hub", id: "hub", x: 300, y: 40, items: [] }
          ]
        }
      ],
      links: [
        { from: "a", to: "hub" },
        { from: "b", to: "hub" }
      ]
    });
    assert.equal(app.lines.length, 5);
    const payload = JSON.parse(app.toJSON());
    assert.ok(Array.isArray(payload.data));
    assert.equal(payload.links.length, 2);
  });

  it("isNodeVisible respects collapsed ancestors", () => {
    const { XSPMindJS } = loadXSPMind();
    const app = new XSPMindJS("mind-root-test", "mind-svg-test");
    app.initflow({
      option: { layout: "none" },
      data: [
        {
          text: "root",
          id: "root",
          collapsed: true,
          items: [{ text: "hidden", id: "hidden", items: [] }]
        }
      ],
      links: [{ from: "root", to: "hidden" }]
    });
    assert.equal(app.isNodeVisible("hidden"), false);
    assert.equal(app.lines.length, 0);
  });
});
