import test from "node:test";
import assert from "node:assert/strict";
import { formatCompactBytes } from "../src/lib/format.ts";

test("traffic and speeds share compact integer units and promote rounded boundaries", () => {
  assert.equal(formatCompactBytes(128.49*1024**3),"128G");
  assert.equal(formatCompactBytes(128.5*1024**3),"129G");
  assert.equal(formatCompactBytes(1023.8*1024**2),"1G");
  assert.equal(formatCompactBytes(288*1024),"288K");
  assert.equal(formatCompactBytes(2.6*1024**2),"3M");
  assert.equal(formatCompactBytes(1023.8*1024),"1M");
});
test("compact values preserve zero, sub-KB readings, and invalid data", () => {
  assert.equal(formatCompactBytes(0),"0B");
  assert.equal(formatCompactBytes(511),"511B");
  assert.equal(formatCompactBytes(1024),"1K");
  for(const value of [-1,NaN,Infinity]) assert.equal(formatCompactBytes(value),"N/A");
});

