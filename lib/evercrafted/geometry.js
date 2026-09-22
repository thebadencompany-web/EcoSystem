"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.angleInClockwiseArc = exports.angleToClockPosition = exports.polarToCanvas = exports.polarToPhysicalCartesian = exports.shortestAngleDistance = exports.normalizeAngle = void 0;
function normalizeAngle(angleDeg) {
    return ((angleDeg % 360) + 360) % 360;
}
exports.normalizeAngle = normalizeAngle;
function shortestAngleDistance(aDeg, bDeg) {
    const difference = Math.abs(normalizeAngle(aDeg) - normalizeAngle(bDeg));
    return Math.min(difference, 360 - difference);
}
exports.shortestAngleDistance = shortestAngleDistance;
function polarToPhysicalCartesian(radiusIn, angleDeg) {
    const radians = (normalizeAngle(angleDeg) - 90) * Math.PI / 180;
    return {
        xIn: radiusIn * Math.cos(radians),
        yIn: -radiusIn * Math.sin(radians),
    };
}
exports.polarToPhysicalCartesian = polarToPhysicalCartesian;
function polarToCanvas(centerX, centerY, radius, angleDeg) {
    const radians = (normalizeAngle(angleDeg) - 90) * Math.PI / 180;
    return {
        x: centerX + radius * Math.cos(radians),
        y: centerY + radius * Math.sin(radians),
    };
}
exports.polarToCanvas = polarToCanvas;
function angleToClockPosition(angleDeg) {
    const totalMinutes = Math.round(normalizeAngle(angleDeg) * 2);
    const hours = Math.floor(totalMinutes / 60) % 12;
    const minutes = totalMinutes % 60;
    return `${hours === 0 ? 12 : hours}:${minutes.toString().padStart(2, '0')}`;
}
exports.angleToClockPosition = angleToClockPosition;
function angleInClockwiseArc(angleDeg, startDeg, endDeg) {
    const angle = normalizeAngle(angleDeg);
    const start = normalizeAngle(startDeg);
    const end = normalizeAngle(endDeg);
    return start <= end ? angle >= start && angle <= end : angle >= start || angle <= end;
}
exports.angleInClockwiseArc = angleInClockwiseArc;
//# sourceMappingURL=geometry.js.map