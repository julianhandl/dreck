import type { CSSProperties } from 'react';

declare module 'react' {
  // Module augmentation needs an interface
  interface CSSProperties {
    '--project-hue'?: number;
  }
}

// Golden angle: consecutive IDs get hues far apart
const GOLDEN_ANGLE = 137.508;

/** Hue (0–359) of a Project, derived from its ID. */
export function projectHue(projectId: number): number {
  return Math.round(projectId * GOLDEN_ANGLE) % 360;
}

/**
 * Style that feeds the `temp-project` colour (`bg-temp-project`, `text-temp-project`, …).
 * @example <span className="size-3 rounded-full bg-temp-project" style={projectColorStyle(project.id)} />
 */
export function projectColorStyle(projectId: number): CSSProperties {
  return { '--project-hue': projectHue(projectId) };
}
