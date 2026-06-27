import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatHardeningReport, runHardeningSuite } from "../src/index.js";

describe("HardeningTestSuite", () => {
  it("runs all production hardening modules without UI dependencies", () => {
    const report = runHardeningSuite({ print: false });

    assert.equal(report.passed, true);
    assert.deepEqual(
      report.results.map((result) => result.module),
      [
        "DeterminismTests",
        "StateIsolationTests",
        "EventStressTests",
        "PatchCollisionTests",
        "SnapshotConsistencyTests",
        "MemoryBoundaryTests"
      ]
    );
    assert.equal(report.results.every((result) => result.passed), true);
  });

  it("formats a compact suite report", () => {
    const report = runHardeningSuite({ print: false });

    assert.equal(
      formatHardeningReport(report),
      [
        "HardeningTestSuite: passed",
        "DeterminismTests: passed",
        "StateIsolationTests: passed",
        "EventStressTests: passed",
        "PatchCollisionTests: passed",
        "SnapshotConsistencyTests: passed",
        "MemoryBoundaryTests: passed"
      ].join("\n")
    );
  });
});
