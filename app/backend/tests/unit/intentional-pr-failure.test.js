import test from "node:test";
import assert from "node:assert/strict";

test("intentional portfolio evidence failure", () => {
  assert.equal(true, false, "Intentional failure for PR quality-gate evidence");
});
