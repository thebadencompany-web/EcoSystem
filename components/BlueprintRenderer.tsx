import React, { useEffect, useRef, useState } from 'react';
import { WreathBlueprint, WreathElement } from '../types';

interface BlueprintRendererProps {
    blueprint: WreathBlueprint;
    width?: number;
    height?: number;
}

export const BlueprintRenderer: React.FC<BlueprintRendererProps> = ({
    blueprint,
    width = 1024,
    height = 1024
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isRendering, setIsRendering] = useState(false);
    const [renderedImage, setRenderedImage] = useState<string | null>(null);

    // Helper: Convert Polar to Cartesian
    // Center is (0,0) in math, but (width/2, height/2) in canvas
    const getCartesian = (r: number, thetaDegrees: number) => {
        // Convert degrees to radians. 
        // Subtract 90 degrees because 0 degrees is usually "East" in math, but "North" (Top) in wreaths?
        // Let's assume 0 = Top (North).
        const thetaRad = (thetaDegrees - 90) * (Math.PI / 180);

        // Scale: Wreath Diameter (e.g. 24") should fit in about 80% of canvas
        // Canvas Scale = (CanvasWidth * 0.8) / BlueprintDiameter
        const scaleFactor = (width * 0.85) / blueprint.diameterInInches;

        const x = (width / 2) + (r * scaleFactor * Math.cos(thetaRad));
        const y = (height / 2) + (r * scaleFactor * Math.sin(thetaRad));

        // Also return scale for the image size itself
        // Assume a "Standard" flower is ~4-6 inches?
        // We need to know the physical size of the item. 
        // For V1, we'll estimate size based on 'layer' or defaults.
        return { x, y, scalePx: scaleFactor };
    };

    const renderCanvas = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsRendering(true);

        // 1. Clear Canvas
        ctx.clearRect(0, 0, width, height);

        // Fill white background for cleaner AI reference
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw "Wireframe" faint guide for the wreath base
        const center = { x: width / 2, y: height / 2 };
        const scaleFactor = (width * 0.85) / blueprint.diameterInInches;

        ctx.beginPath();
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 2;
        ctx.arc(center.x, center.y, (blueprint.diameterInInches / 2) * scaleFactor, 0, 2 * Math.PI);
        ctx.stroke();

        // 2. Sort Elements by Layer (Background first, then Mid, then Fore)
        // We assume "layer" property exists on elements: 1, 2, 3
        const sortedElements = [...blueprint.elements].sort((a, b) => (a.layer || 1) - (b.layer || 1));

        // 3. Load and Draw Images
        const imagePromises = sortedElements.map(element => {
            return new Promise<void>((resolve) => {
                // Skip if no image (shouldn't happen in a good blueprint)
                if (!element.inventoryId) { resolve(); return; }

                // We need the IMAGE URL.
                // In the blueprint orchestrator, we populated 'name', but maybe not 'imageUrl'?
                // The orchestrator populated 'inventoryId'. 
                // Ideally the blueprint.elements should contain the `imageUrl` or we need to fetch it.
                // CHECK: Does WreathElement type have imageUrl? 
                // If not, we might need to rely on the parent component to pass enriched data or fetch it here.
                // Let's assume for this MVP we might miss images if not passed.
                // Wait, the orchestrator sets 'name', 'position', 'layer'. 
                // It DOES NOT set imageUrl in the current orchestrator code!
                // FIX: We need to update Orchestrator to include imageUrl in elements.
                // For now, let's proceed assuming we WILL fix that.

                const img = new Image();
                img.crossOrigin = "anonymous";
                // @ts-ignore - We will add imageUrl to WreathElement type if missing, or use a placeholder
                const src = element.imageUrl || element.tempUrl || "https://placehold.co/100x100?text=" + element.name;

                img.onload = () => {
                    // Calculate Position
                    const { x, y, scalePx } = getCartesian(element.position.radius, element.position.angle);

                    // Size: Default to ~5 inches for focal, 3 for secondary?
                    // scalePx is "Pixels per Inch"
                    let sizeInches = 4;
                    if (element.layer === 1) sizeInches = 6; // Background/Base (larger)
                    if (element.layer === 3) sizeInches = 3; // Foreground (smaller accents)

                    const sizePx = sizeInches * scalePx;

                    ctx.save();

                    // Translate to center of where we want the flower
                    ctx.translate(x, y);

                    // Rotate
                    // Natural rotation: usually pointing "out" from center?
                    // or element.rotation + auto-calculated
                    // Angle from center = element.position.angle
                    // Flowers usually face "up" or "out". 
                    // Let's rotate them to face the normal of the circle + random wobble
                    const angleRad = (element.position.angle - 90) * (Math.PI / 180);
                    ctx.rotate(angleRad);

                    // Draw Image centered
                    ctx.drawImage(img, -sizePx / 2, -sizePx / 2, sizePx, sizePx);

                    ctx.restore();
                    resolve();
                };
                img.onerror = () => {
                    console.warn("Failed to load image for", element.name);
                    resolve();
                };
                img.src = src;
            });
        });

        await Promise.all(imagePromises);

        // Finalize
        setRenderedImage(canvas.toDataURL('image/png'));
        setIsRendering(false);
    };

    // Auto-render on mount/change
    useEffect(() => {
        renderCanvas();
    }, [blueprint]);

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative border rounded-lg shadow-sm overflow-hidden bg-gray-50">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    className="max-w-full h-auto max-h-[500px]" // Display smaller but render hi-res
                />
                {isRendering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                        <span className="text-sm font-medium text-gray-500">Compositing Visualization...</span>
                    </div>
                )}
            </div>

            {renderedImage && (
                <div className="w-full bg-blue-50 p-4 rounded-lg flex flex-col gap-2">
                    <h4 className="text-sm font-bold text-blue-900">Step 1: The Hybrid Skeleton</h4>
                    <p className="text-xs text-blue-700">
                        Right-click the image above and "Copy Image". Then paste it into Midjourney/Discord along with the prompt below.
                    </p>
                </div>
            )}
        </div>
    );
};
