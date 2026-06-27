import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { compareExecutions, formatReport, runEvents, runWithComparison } from "../src/index.js";
import type { RuntimeHarnessResult } from "../src/index.js";

describe("DriftDetector", () => {
  it("reports deterministic output for repeated runtime executions", () => {
    const report = runWithComparison(
      [
        { type: "create_world" },
        { type: "message", payload: "hello" },
        { type: "switch_world", payload: "reality" }
      ],
      3,
      { print: false }
    );

    assert.equal(report.deterministic, true);
    assert.equal(report.runs, 3);
    assert.equal(report.findings.length, 0);
    assert.equal(formatReport(report), "DriftDetector: deterministic\nruns=3\nfindings=0");
  });

  it("compares kernel, patch, snapshot, and final world outputs", () => {
    const report = runWithComparison(
      [
        { type: "create_world" },
        {
          type: "world_patch",
          payload: {
            worldView: { era: "near-future" },
            settings: { memoryMode: "world-scoped" }
          }
        },
        {
          type: "contact_persona",
          payload: {
            actorId: "ovone",
            tone: { warmth: "steady" }
          }
        },
        { type: "message", payload: "mixed drift check" }
      ],
      4,
      { print: false }
    );

    assert.equal(report.deterministic, true);
    assert.equal(report.executions.length, 4);
  });

  it("identifies the drift layer and first divergence point", () => {
    const baseline = runEvents([{ type: "message", payload: "stable" }], { print: false });
    const drifted = driftPatchText(baseline, "changed");
    const report = compareExecutions([baseline, drifted]);

    assert.equal(report.deterministic, false);
    assert.equal(report.findings[0]?.layer, "Patch");
    assert.equal(report.findings[0]?.firstDivergencePoint, "Patch[0]");
    assert.match(formatReport(report), /layer=Patch/);
  });
});

function driftPatchText(result: RuntimeHarnessResult, text: string): RuntimeHarnessResult {
  return {
    ...result,
    logs: result.logs.map((log) => {
      if (log.kind !== "patches" || log.patches.length === 0) {
        return log;
      }

      return {
        ...log,
        patches: log.patches.map((patch) => {
          if (patch.targetField !== "chat.chats" || !patch.value || typeof patch.value !== "object") {
            return patch;
          }

          const chat = patch.value as {
            readonly messages?: readonly Readonly<Record<string, unknown>>[];
          };

          return {
            ...patch,
            value: {
              ...chat,
              messages: (chat.messages ?? []).map((message) => ({
                ...message,
                text
              }))
            }
          };
        })
      };
    })
  };
}
