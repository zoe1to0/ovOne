export type ComposerKind = "normal" | "ovo";
export type ComposerMode = "text" | "voice-button" | "world-button";

const NORMAL_MODES = Object.freeze(["text", "voice-button"] as const);
const OVO_MODES = Object.freeze(["world-button", "text"] as const);

export function resolveComposerModes(kind: ComposerKind): readonly ComposerMode[] {
  return kind === "ovo" ? OVO_MODES : NORMAL_MODES;
}

export function resolveDefaultComposerMode(kind: ComposerKind): ComposerMode {
  return kind === "ovo" ? "world-button" : "text";
}

export function toggleComposerMode(kind: ComposerKind, currentMode: ComposerMode): ComposerMode {
  const modes = resolveComposerModes(kind);
  const currentIndex = modes.indexOf(currentMode);
  if (currentIndex < 0) {
    return resolveDefaultComposerMode(kind);
  }
  return modes[(currentIndex + 1) % modes.length] ?? resolveDefaultComposerMode(kind);
}

export function isComposerModeAllowed(kind: ComposerKind, mode: ComposerMode): boolean {
  return resolveComposerModes(kind).includes(mode);
}
