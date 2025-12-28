// components/RotationPropertiesEditor.tsx
// Editable UI for viewing and modifying rotation properties of inventory items

import React, { useMemo } from 'react';
import type { RotationProperties, CompositionRole } from '../types';
import { getDefaultRotationProperties } from '../lib/rotationUtils';

interface RotationPropertiesEditorProps {
    rotationProperties?: RotationProperties;
    compositionRole?: CompositionRole;
    onChange: (props: RotationProperties) => void;
    showAdvanced?: boolean;
}

/**
 * Small preview canvas showing how the flower would rotate at different wreath positions
 */
const RotationPreview: React.FC<{ rotationProperties: RotationProperties }> = ({ rotationProperties }) => {
    const positions = [
        { angle: 0, label: 'Top' },
        { angle: 90, label: 'Right' },
        { angle: 180, label: 'Bottom' },
        { angle: 270, label: 'Left' },
    ];

    // Calculate rotation for each position
    const calculateRotation = (wreathAngle: number) => {
        let baseRotation = 0;
        const normalized = ((wreathAngle % 360) + 360) % 360;

        if (normalized >= 0 && normalized < 90) {
            baseRotation = (normalized / 90) * 40;
        } else if (normalized >= 90 && normalized < 180) {
            baseRotation = 40 + ((normalized - 90) / 90) * 30;
        } else if (normalized >= 180 && normalized < 270) {
            baseRotation = -(40 + ((270 - normalized) / 90) * 30);
        } else {
            baseRotation = -((360 - normalized) / 90) * 40;
        }

        baseRotation += rotationProperties.naturalDroop;

        // Clamp
        if (!rotationProperties.allowUpsideDown && Math.abs(baseRotation) > 90) {
            baseRotation = Math.sign(baseRotation) * 90;
        }
        baseRotation = Math.max(rotationProperties.minRotation, Math.min(rotationProperties.maxRotation, baseRotation));

        return baseRotation;
    };

    return (
        <div className="flex justify-between items-center gap-1 p-2 bg-gray-50 rounded-lg border">
            {positions.map(({ angle, label }) => {
                const rotation = calculateRotation(angle);
                return (
                    <div key={angle} className="flex flex-col items-center">
                        <div
                            className="w-8 h-8 bg-gradient-to-t from-green-600 to-green-400 rounded-t-full"
                            style={{
                                transform: `rotate(${rotation}deg)`,
                                transformOrigin: 'center bottom'
                            }}
                        />
                        <span className="text-[10px] text-gray-500 mt-1">{label}</span>
                        <span className="text-[9px] text-gray-400">{rotation.toFixed(0)}°</span>
                    </div>
                );
            })}
        </div>
    );
};

/**
 * Slider component with min/max labels and value display
 */
const AngleSlider: React.FC<{
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    unit?: string;
    description?: string;
}> = ({ label, value, onChange, min, max, unit = '°', description }) => (
    <div className="space-y-1">
        <div className="flex justify-between items-center">
            <label className="text-xs font-medium text-gray-700">{label}</label>
            <span className="text-xs font-mono text-gray-500">{value}{unit}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600"
        />
        {description && (
            <p className="text-[10px] text-gray-400">{description}</p>
        )}
    </div>
);

export const RotationPropertiesEditor: React.FC<RotationPropertiesEditorProps> = ({
    rotationProperties,
    compositionRole,
    onChange,
    showAdvanced = false,
}) => {
    // Get effective properties (user-set or defaults based on role)
    const props = useMemo(() => {
        if (rotationProperties) return rotationProperties;
        return getDefaultRotationProperties(compositionRole);
    }, [rotationProperties, compositionRole]);

    const handleChange = (field: keyof RotationProperties, value: any) => {
        onChange({
            ...props,
            [field]: value,
        });
    };

    const handleReset = () => {
        onChange(getDefaultRotationProperties(compositionRole));
    };

    return (
        <div className="space-y-4">
            {/* Header with reset button */}
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800">Rotation & Positioning</h4>
                <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                    Reset to defaults
                </button>
            </div>

            {/* Live Preview */}
            <div>
                <label className="text-xs text-gray-600 mb-1 block">Preview on wreath</label>
                <RotationPreview rotationProperties={props} />
            </div>

            {/* Core rotation limits */}
            <div className="grid grid-cols-2 gap-3">
                <AngleSlider
                    label="Max Right Tilt"
                    value={props.maxRotation}
                    onChange={(v) => handleChange('maxRotation', v)}
                    min={0}
                    max={180}
                    description="Clockwise limit"
                />
                <AngleSlider
                    label="Max Left Tilt"
                    value={Math.abs(props.minRotation)}
                    onChange={(v) => handleChange('minRotation', -v)}
                    min={0}
                    max={180}
                    description="Counter-clockwise limit"
                />
            </div>

            {/* Natural Droop - most important setting */}
            <AngleSlider
                label="Natural Droop"
                value={props.naturalDroop}
                onChange={(v) => handleChange('naturalDroop', v)}
                min={-45}
                max={45}
                description="Negative = points up, Positive = droops down"
            />

            {/* Allow upside down toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={props.allowUpsideDown}
                    onChange={(e) => handleChange('allowUpsideDown', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-gray-700 focus:ring-gray-500"
                />
                <div>
                    <span className="text-xs font-medium text-gray-700">Allow upside-down</span>
                    <p className="text-[10px] text-gray-400">Enable for cascading greenery, berries</p>
                </div>
            </label>

            {/* Advanced options (collapsed by default) */}
            {showAdvanced && (
                <details className="border-t pt-3">
                    <summary className="text-xs font-medium text-gray-600 cursor-pointer">
                        Advanced Options
                    </summary>
                    <div className="mt-3 space-y-3">
                        {/* Preferred range */}
                        <div className="grid grid-cols-2 gap-3">
                            <AngleSlider
                                label="Preferred Start"
                                value={props.preferredAngleStart}
                                onChange={(v) => handleChange('preferredAngleStart', v)}
                                min={-90}
                                max={90}
                            />
                            <AngleSlider
                                label="Preferred End"
                                value={props.preferredAngleEnd}
                                onChange={(v) => handleChange('preferredAngleEnd', v)}
                                min={-90}
                                max={90}
                            />
                        </div>

                        {/* Native facing angle */}
                        <AngleSlider
                            label="Native Facing Angle"
                            value={props.nativeFacingAngle}
                            onChange={(v) => handleChange('nativeFacingAngle', v)}
                            min={-180}
                            max={180}
                            description="Angle the flower faces in the uploaded image"
                        />

                        {/* Facing symmetry */}
                        <div>
                            <label className="text-xs font-medium text-gray-700 block mb-1">Facing Symmetry</label>
                            <select
                                value={props.facingSymmetry}
                                onChange={(e) => handleChange('facingSymmetry', e.target.value)}
                                className="w-full p-2 border rounded-md text-sm bg-white"
                            >
                                <option value="radial">Radial (round, can rotate freely)</option>
                                <option value="bilateral">Bilateral (left-right symmetric)</option>
                                <option value="directional">Directional (points one way)</option>
                            </select>
                        </div>

                        {/* Allow mirror */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={props.allowMirror}
                                onChange={(e) => handleChange('allowMirror', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-gray-700 focus:ring-gray-500"
                            />
                            <span className="text-xs text-gray-700">Allow horizontal flip</span>
                        </label>
                    </div>
                </details>
            )}
        </div>
    );
};

export default RotationPropertiesEditor;
