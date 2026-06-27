import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { runEvents } from "../src/index.js";

describe("Runtime harness", () => {
  it("runs simulated events through kernel, patch queue, domain snapshot, and console output", () => {
    const lines: string[] = [];
    const result = runEvents(
      [
        { type: "create_world" },
        { type: "message", payload: "hello" },
        { type: "switch_world", payload: "reality" }
      ],
      {
        print: true,
        logger: (line) => lines.push(line)
      }
    );

    assert.equal(result.snapshot.worldMeta.id, "reality");
    assert.ok(lines.some((line) => line.includes("[kernel] processed message.submitted")));
    assert.ok(lines.some((line) => line.includes("[patchqueue] 1 new patch(es)")));
    assert.ok(lines.some((line) => line.includes('"text": "hello"')));
    assert.ok(lines.some((line) => line.includes('"worldMeta"')));
  });
});
