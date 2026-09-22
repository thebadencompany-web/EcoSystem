"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableIdentifier = exports.randomBetween = exports.createSeededRandom = void 0;
function hashSeed(seed) {
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function createSeededRandom(seed) {
    let state = hashSeed(seed) || 0x6d2b79f5;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}
exports.createSeededRandom = createSeededRandom;
function randomBetween(random, minimum, maximum) {
    return minimum + random() * (maximum - minimum);
}
exports.randomBetween = randomBetween;
function stableIdentifier(prefix, value) {
    return `${prefix}_${hashSeed(value).toString(16).padStart(8, '0')}`;
}
exports.stableIdentifier = stableIdentifier;
//# sourceMappingURL=seededRandom.js.map