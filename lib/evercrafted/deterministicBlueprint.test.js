"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const asymmetricCrescent_1 = require("./asymmetricCrescent");
const geometry_1 = require("./geometry");
function approximatelyEqual(actual, expected) {
    assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} did not equal ${expected}`);
}
const top = (0, geometry_1.polarToPhysicalCartesian)(10, 0);
approximatelyEqual(top.xIn, 0);
approximatelyEqual(top.yIn, 10);
const right = (0, geometry_1.polarToPhysicalCartesian)(10, 90);
approximatelyEqual(right.xIn, 10);
approximatelyEqual(right.yIn, 0);
const bottom = (0, geometry_1.polarToPhysicalCartesian)(10, 180);
approximatelyEqual(bottom.xIn, 0);
approximatelyEqual(bottom.yIn, -10);
const left = (0, geometry_1.polarToPhysicalCartesian)(10, 270);
approximatelyEqual(left.xIn, -10);
approximatelyEqual(left.yIn, 0);
assert.deepStrictEqual((0, geometry_1.polarToCanvas)(100, 100, 10, 0), { x: 100, y: 90 });
assert.deepStrictEqual((0, geometry_1.polarToCanvas)(100, 100, 10, 90), { x: 110, y: 100 });
assert.strictEqual((0, geometry_1.angleToClockPosition)(0), '12:00');
assert.strictEqual((0, geometry_1.angleToClockPosition)(30), '1:00');
assert.strictEqual((0, geometry_1.angleToClockPosition)(90), '3:00');
assert.strictEqual((0, geometry_1.angleToClockPosition)(359.5), '11:59');
assert.strictEqual((0, geometry_1.angleInClockwiseArc)(355, 350, 20), true);
assert.strictEqual((0, geometry_1.angleInClockwiseArc)(10, 350, 20), true);
assert.strictEqual((0, geometry_1.angleInClockwiseArc)(180, 350, 20), false);
const baseInput = {
    seed: 'evercrafted-contract-test',
    essenceId: 'essence_peaceful-remembrance',
    inventorySource: 'evercrafted',
    inventorySnapshotId: 'inventory_fixture_v1',
    finishedDiameterIn: 24,
    focalClock: 2,
    density: 'balanced',
    selectedItems: [
        { inventoryId: 'cedar_001', role: 'base', quantity: 12 },
        { inventoryId: 'eucalyptus_001', role: 'transitional_green', quantity: 8 },
        { inventoryId: 'hydrangea_001', role: 'primary', quantity: 5 },
        { inventoryId: 'brunia_001', role: 'accent', quantity: 4 },
    ],
};
const first = (0, asymmetricCrescent_1.generateAsymmetricCrescent)(baseInput);
const second = (0, asymmetricCrescent_1.generateAsymmetricCrescent)(baseInput);
assert.deepStrictEqual(first, second);
assert.strictEqual(JSON.stringify(first), JSON.stringify(second));
assert.strictEqual(first.formulaId, 'asymmetric_crescent_v1');
assert.strictEqual(first.focalClock, 2);
assert.strictEqual(first.quality.silenceArcViolations, 0);
assert.ok(first.elements.every((element) => baseInput.selectedItems.some((item) => item.inventoryId === element.inventoryItemId)));
assert.ok(first.passes.pass1ElementIds.length > 0);
assert.ok(first.passes.pass2ElementIds.length > 0);
assert.ok(first.elements.filter((element) => element.zIndex === 1).every((element) => element.pocketId === undefined));
[1, 2, 3].forEach((focalClock) => {
    const blueprint = (0, asymmetricCrescent_1.generateAsymmetricCrescent)(Object.assign(Object.assign({}, baseInput), { focalClock }));
    assert.strictEqual(blueprint.quality.silenceArcViolations, 0);
});
const alternate = (0, asymmetricCrescent_1.generateAsymmetricCrescent)(Object.assign(Object.assign({}, baseInput), { seed: 'alternate-seed' }));
assert.notStrictEqual(JSON.stringify(first.elements), JSON.stringify(alternate.elements));
for (let index = 0; index < 300; index += 1) {
    const focalClock = ((index % 3) + 1);
    const blueprint = (0, asymmetricCrescent_1.generateAsymmetricCrescent)(Object.assign(Object.assign({}, baseInput), { seed: `stress-${index}`, focalClock }));
    assert.strictEqual(blueprint.quality.silenceArcViolations, 0);
}
console.log('Deterministic blueprint contract tests passed.');
//# sourceMappingURL=deterministicBlueprint.test.js.map