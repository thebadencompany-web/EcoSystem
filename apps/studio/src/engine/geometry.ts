export function normalizeAngle(angleDeg: number): number {
  return ((angleDeg % 360) + 360) % 360;
}

export function polarToPhysical(radiusIn: number, angleDeg: number): { xIn: number; yIn: number } {
  const radians = normalizeAngle(angleDeg) * Math.PI / 180;
  return { xIn: radiusIn * Math.sin(radians), yIn: radiusIn * Math.cos(radians) };
}

export function physicalToScreen(centerX: number, centerY: number, xIn: number, yIn: number, pixelsPerInch = 1): { x: number; y: number } {
  return { x: centerX + xIn * pixelsPerInch, y: centerY - yIn * pixelsPerInch };
}

export function polarToScreen(centerX: number, centerY: number, radiusIn: number, angleDeg: number, pixelsPerInch = 1): { x: number; y: number } {
  const physical = polarToPhysical(radiusIn, angleDeg);
  return physicalToScreen(centerX, centerY, physical.xIn, physical.yIn, pixelsPerInch);
}

export function angleToClockPosition(angleDeg: number): string {
  const totalMinutes = Math.round(normalizeAngle(angleDeg) * 2) % 720;
  const hour = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hour === 0 ? 12 : hour}:${minutes.toString().padStart(2, "0")}`;
}

export function angleInClockwiseArc(angleDeg: number, startDeg: number, endDeg: number): boolean {
  const angle = normalizeAngle(angleDeg);
  const start = normalizeAngle(startDeg);
  const end = normalizeAngle(endDeg);
  return start <= end ? angle >= start && angle <= end : angle >= start || angle <= end;
}
