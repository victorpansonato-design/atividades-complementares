export const ITEM_MOTION_TRANSITION = { duration: 0.18, ease: [0.22, 1, 0.36, 1] } as const;
export const SECTION_MOTION_TRANSITION = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;

export function isPathActive(currentPath: string, targetPath: string, exact = false): boolean {
   if (exact) return currentPath === targetPath;

   const normalizedTarget = targetPath === "/" ? targetPath : targetPath.replace(/\/+$/, "");
   return currentPath === normalizedTarget || (normalizedTarget !== "/" && currentPath.startsWith(`${normalizedTarget}/`));
}
