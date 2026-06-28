import type { WorldId } from "../world-domain/index.js";

export const WORLD_EDITOR_NAME_REQUIRED_MESSAGE = "请输入世界名称";
export const WORLD_EDITOR_REALITY_LOCKED_MESSAGE = "现实世界世界观不可修改";
export const WORLD_EDITOR_SAVE_UNAVAILABLE_MESSAGE = "保存暂未开放";
export const WORLD_EDITOR_SAVE_SUCCESS_MESSAGE = "已保存";
export const WORLD_EDITOR_EMPTY_WORLDVIEW_WARNING = "清空世界观会使该世界更接近空白世界";
export const WORLD_EDITOR_LARGE_WORLDVIEW_CHANGE_WARNING = "大幅修改世界观可能影响该世界内角色表现和后续体验";

export type WorldEditorPatch = Readonly<{
  readonly worldId: WorldId;
  readonly name: string;
  readonly worldview: string;
}>;

export type WorldEditorForbiddenPatchField =
  | "WorldContact"
  | "WorldChat"
  | "WorldMemory"
  | "GlobalAIModel"
  | "GlobalAILink"
  | "Reality";

export type WorldEditorPatchValidation = Readonly<{
  readonly valid: boolean;
  readonly patch: WorldEditorPatch | null;
  readonly fieldErrors: Readonly<{
    readonly name: string | null;
  }>;
  readonly forbiddenFields: readonly WorldEditorForbiddenPatchField[];
}>;

export type WorldEditorEditabilityInput = Readonly<{
  readonly worldType: "reality" | "custom";
}>;

export type WorldEditorWarningsInput = Readonly<{
  readonly locked: boolean;
  readonly originalWorldview: string;
  readonly nextWorldview: string;
}>;

export function canEditWorld(input: WorldEditorEditabilityInput): boolean {
  return input.worldType !== "reality";
}

export function validateWorldEditorPatch(
  patch: WorldEditorPatch,
  input: WorldEditorEditabilityInput
): WorldEditorPatchValidation {
  const forbiddenFields = getForbiddenWorldEditorPatchFields(input);
  const name = patch.name.trim();
  const locked = !canEditWorld(input);
  const nameError = locked || name ? null : WORLD_EDITOR_NAME_REQUIRED_MESSAGE;
  const valid = !locked && nameError === null;
  return Object.freeze({
    valid,
    patch: valid
      ? Object.freeze({
          worldId: patch.worldId,
          name,
          worldview: patch.worldview
        })
      : null,
    fieldErrors: Object.freeze({
      name: nameError
    }),
    forbiddenFields
  });
}

export function getWorldEditorWarnings(input: WorldEditorWarningsInput): readonly string[] {
  if (input.locked) {
    return Object.freeze([]);
  }
  const warnings: string[] = [];
  if (!input.nextWorldview.trim()) {
    warnings.push(WORLD_EDITOR_EMPTY_WORLDVIEW_WARNING);
  }
  if (hasLargeWorldviewChange(input.originalWorldview, input.nextWorldview)) {
    warnings.push(WORLD_EDITOR_LARGE_WORLDVIEW_CHANGE_WARNING);
  }
  return Object.freeze(warnings);
}

export function getForbiddenWorldEditorPatchFields(
  input: WorldEditorEditabilityInput
): readonly WorldEditorForbiddenPatchField[] {
  const fields: WorldEditorForbiddenPatchField[] = [
    "WorldContact",
    "WorldChat",
    "WorldMemory",
    "GlobalAIModel",
    "GlobalAILink"
  ];
  if (input.worldType === "reality") {
    fields.push("Reality");
  }
  return Object.freeze(fields);
}

function hasLargeWorldviewChange(originalWorldview: string, nextWorldview: string): boolean {
  const original = originalWorldview.trim();
  const next = nextWorldview.trim();
  if (!original || !next || original === next) {
    return false;
  }
  return true;
}
