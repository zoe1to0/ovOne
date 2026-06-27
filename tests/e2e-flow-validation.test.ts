import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatEndToEndFlowReport, runEndToEndFlowValidation } from "../src/index.js";

describe("EndToEndFlowValidationSuite", () => {
  it("validates full UI to runtime to snapshot flows", () => {
    const report = runEndToEndFlowValidation({ print: false });

    assert.equal(report.passed, true);
    assert.deepEqual(
      report.results.map((result) => result.flow),
      [
        "WorldCreationChatSnapshotFlow",
        "WorldSwitchingConsistencyFlow",
        "ContactModeBehaviorFlow",
        "InputPanelKernelSnapshotFlow"
      ]
    );
    assert.equal(report.results.every((result) => result.failures.length === 0), true);
  });

  it("formats a compact end-to-end report", () => {
    const report = runEndToEndFlowValidation({ print: false });

    assert.equal(
      formatEndToEndFlowReport(report),
      [
        "EndToEndFlowValidationSuite: passed",
        "WorldCreationChatSnapshotFlow: passed",
        "WorldSwitchingConsistencyFlow: passed",
        "ContactModeBehaviorFlow: passed",
        "InputPanelKernelSnapshotFlow: passed"
      ].join("\n")
    );
  });
});
