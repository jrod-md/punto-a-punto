export function needsIosInstallTip(
  userAgent: string,
  platform: string,
  touchPoints: number,
  standalone: boolean,
  shown: boolean,
): boolean {
  const ios =
    /iPhone|iPad|iPod/.test(userAgent) ||
    (platform === 'MacIntel' && touchPoints > 1);
  return (
    ios &&
    /Safari/.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS/.test(userAgent) &&
    !standalone &&
    !shown
  );
}
export async function requestPersistentStorage(storage?: {
  persist(): Promise<boolean>;
}): Promise<boolean> {
  try {
    return storage ? await storage.persist() : false;
  } catch {
    return false;
  }
}
