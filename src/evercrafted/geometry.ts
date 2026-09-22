export function normalizeAngle(angleDeg: number): number {
    return ((angleDeg % 360) + 360) % 360;
}

export function shortestAngleDistance(aDeg: number, bDeg: number): number {
    const difference = Math.abs(normalizeAngle(aDeg) - normalizeAngle(bDeg));
    return Math.min(difference, 360 - difference);
}

export function polarToPhysicalCartesian(radiusIn: number, angleDeg: number): { xIn: number; yIn: number } {
    const radians = (normalizeAngle(angleDeg) - 90) * Math.PI / 180;
    return {
        xIn: radiusIn * Math.cos(radians),
        yIn: -radiusIn * Math.sin(radians),
    };
}

export function polarToCanvas(
    centerX: number,
    centerY: number,
    radius: number,
    angleDeg: number,
): { x: number; y: number } {
    const radians = (normalizeAngle(angleDeg) - 90) * Math.PI / 180;
    return {
        x: centerX + radius * Math.cos(radians),
        y: centerY + radius * Math.sin(radians),
    };
}

export function angleToClockPosition(angleDeg: number): string {
    const totalMinutes = Math.round(normalizeAngle(angleDeg) * 2);
    const hours = Math.floor(totalMinutes / 60) % 12;
    const minutes = totalMinutes % 60;
    return `${hours === 0 ? 12 : hours}:${minutes.toString().padStart(2, '0')}`;
}

export function angleInClockwiseArc(angleDeg: number, startDeg: number, endDeg: number): boolean {
    const angle = normalizeAngle(angleDeg);
    const start = normalizeAngle(startDeg);
    const end = normalizeAngle(endDeg);
    return start <= end ? angle >= start && angle <= end : angle >= start || angle <= end;
}
