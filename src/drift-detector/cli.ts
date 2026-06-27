import { runWithComparison } from "./drift-detector.js";

runWithComparison(
  [
    { type: "create_world" },
    { type: "message", payload: "hello" },
    { type: "switch_world", payload: "reality" }
  ],
  3
);
