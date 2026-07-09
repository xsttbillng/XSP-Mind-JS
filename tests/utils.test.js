import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadXSPMind } from "./helpers.js";

describe("XSPMindJS pure utils", () => {
  const { XSPMindJS } = loadXSPMind();
  const t = XSPMindJS.__test__;

  it("normalizeArrowStyle handles boolean and names", () => {
    assert.equal(t.normalizeArrowStyle(true), "triangle");
    assert.equal(t.normalizeArrowStyle(false), null);
    assert.equal(t.normalizeArrowStyle("open"), "open");
    assert.equal(t.normalizeArrowStyle("none"), null);
  });

  it("measureTreeSpan respects collapsed", () => {
    const node = {
      collapsed: true,
      items: [{ items: [] }, { items: [] }]
    };
    assert.equal(t.measureTreeSpan(node), 1);
    node.collapsed = false;
    assert.equal(t.measureTreeSpan(node), 2);
  });

  it("cubicBezierPoint ends at p3 when t=1", () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 50, y: 0 };
    const p2 = { x: 50, y: 100 };
    const p3 = { x: 100, y: 100 };
    const end = t.cubicBezierPoint(1, p0, p1, p2, p3);
    assert.equal(end.x, 100);
    assert.equal(end.y, 100);
  });

  it("nodeMatchesQuery matches text and id", () => {
    assert.equal(t.nodeMatchesQuery({ text: "架构设计", id: "a1" }, "架构"), true);
    assert.equal(t.nodeMatchesQuery({ text: "x", id: "tech-1" }, "tech"), true);
    assert.equal(t.nodeMatchesQuery({ text: "x", id: "a" }, "zzz"), false);
  });
});
