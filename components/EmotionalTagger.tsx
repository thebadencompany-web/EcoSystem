import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import type {
    InventoryItem,
    BotanicalShape,
    BotanicalTexture,
    BotanicalComplexity,
    VisualFeatures,
    EmotionalDimensions,
    EnhancedBotanicalProperties,
    ColorTemperature,
    ColorHarmonyRole,
    DirectionalEnergy,
    DepthLayer,
    StackingBehavior,
    StemStyle,
    TuckDepth,
    InsertionAngle,
    SpacingPreference,
    TransitionRole,
    HealingStageTag,
    SprayProfile,
    LayerRole,
    GesturePrimary,
    GestureFamily,
    SpatialFlow,
    EmotionalFamily,
    EmotionalGrammarItem,
    CompositionRole,
} from '../types';
import { Loader } from './Loader';
import {
    botanicalAnalysisAgent,
    premiumEmotionPipeline,
    clearStemAgent,
    logicEngineAgent,
} from '../services/aiAgents';
import { isRemoveBgConfigured } from '../services/config';
import { loadImage, removeBackground, blobToBase64, base64ToBlob } from '../lib/backgroundRemoval';
import {
    discoverEmotionsFromColors,
    discoveredToGrammarItem,
    shouldAutoAdd
} from '../services/emotionDiscoveryService';

interface EmotionalTaggerProps {
    addInventoryItem: (
        item: Omit<InventoryItem, 'id' | 'imageUrl' | 'processedImageUrl' | 'originalImageUrl' | 'svgUrl'>,
        assets: { processed: Blob; original?: Blob; svgText?: string }
    ) => Promise<InventoryItem>;
    grammar?: EmotionalGrammarItem[];
    addGrammarItem?: (item: Omit<EmotionalGrammarItem, 'id'>) => void;
    initialItem?: InventoryItem | null;
}

type Stage = 'upload' | 'crop' | 'remove-bg' | 'analyze' | 'calibrate';

const SHAPES: BotanicalShape[] = ['round', 'cascading', 'spiral', 'linear', 'pointed', 'other'];
const TEXTURES: BotanicalTexture[] = ['smooth', 'ruffled', 'spiky', 'velvety', 'clustered', 'other'];
const COMPLEXITIES: BotanicalComplexity[] = ['simple', 'moderate', 'complex'];

const COLOR_TEMPERATURES: ColorTemperature[] = ['warm', 'cool', 'neutral'];
const DIRECTIONAL_ENERGIES: DirectionalEnergy[] = ['upward', 'outward', 'draping', 'clustered'];
const DEPTH_LAYERS: DepthLayer[] = ['background', 'mid-ground', 'focal', 'foreground'];
const STACKING_BEHAVIORS: StackingBehavior[] = ['base', 'builds-on', 'tops'];
const STEM_STYLES: StemStyle[] = ['single', 'branched', 'spray', 'cluster', 'pick'];
const TUCK_DEPTHS: TuckDepth[] = ['shallow', 'medium', 'deep'];
const INSERTION_ANGLES: InsertionAngle[] = ['vertical', 'angled', 'horizontal'];
const SPACING_PREFERENCES: SpacingPreference[] = ['tight', 'medium', 'airy'];
const TRANSITION_ROLES: TransitionRole[] = ['bridge', 'anchor', 'accent'];
const HEALING_STAGES: HealingStageTag[] = ['acute', 'processing', 'acceptance', 'remembrance'];
const LAYER_ROLES: LayerRole[] = ['focal', 'filler', 'texture', 'accent', 'trailing'];
const GESTURE_PRIMARIES: GesturePrimary[] = ['Spiral', 'Cascade', 'Radiate', 'Embrace', 'Flow'];
const GESTURE_FAMILIES: GestureFamily[] = ['Flow', 'Embrace', 'Reverence', 'Celebration', 'Comfort'];
const SPATIAL_FLOWS: SpatialFlow[] = ['radial', 'linear', 'cascade', 'spiral'];
const EMOTIONAL_FAMILIES: EmotionalFamily[] = ['Joy', 'Love', 'Peace', 'Melancholy', 'Hope', 'Reverence', 'Neutral'];
const COMPOSITION_ROLES: CompositionRole[] = ['focal', 'secondary', 'filler', 'accent'];

interface AnalysisResult {
    name: string;
    type: 'floral' | 'greenery' | 'accent';
    dominantColors: string[];
    brightness: number;
    shape: BotanicalShape;
    texture: BotanicalTexture;
    complexity: BotanicalComplexity;
    seasonTags: string[];
    culturalTags: string[];
    symbolMeaning: string;
    fragilityScore: number;
    emotionTags: string[];
    emotionalDimensions: {
        valence: number;
        arousal: number;
        temporalWeight: number;
    };
    suggestedWidthInches: number;
    suggestedHeightInches: number;
    svgRepresentation: string;
    logicTrail: string[];
    enhancedProperties: EnhancedBotanicalProperties;
    sprayProfile?: SprayProfile;
    identificationConfidence: number;
    compositionRole: CompositionRole;
}

const getDefaultEnhancedProps = (): EnhancedBotanicalProperties => ({
    colorTheory: { colorTemperature: 'neutral', colorHarmony: ['monochromatic'], undertones: [] },
    compositionalBehavior: { visualWeight: 0.5, directionalEnergy: 'outward', scaleRange: { min: 1, max: 2 } },
    narrativeMeaning: { griefSuitability: 0.7, celebrationSuitability: 0.5, romanticSuitability: 0.5, healingStageAlignment: ['processing', 'acceptance'] },
    layering: { depthLayer: 'mid-ground', overlapTolerance: 0.5, silhouettePriority: 0.5, stackingBehavior: 'builds-on', coverageRadiusInches: 3 },
    tuckPoint: { stemStyle: 'single', tuckDepth: 'medium', insertionAngle: 'angled', anchorStrength: 0.6, gapFillerScore: 0.4 },
    neighborInteraction: { spacingPreference: 'medium', clusteringCompatibility: 0.5, transitionRole: 'bridge' },
    designHarmony: { harmonicPairings: [], contrastSuggestions: [], layerRole: 'filler' },
    emotionalTaxonomy: {
        primaryEmotion: 'Neutral',
        emotionalFamily: 'Neutral',
        intensity: 0.5,
        complexity: 0.3,
        resonanceScore: 0.5,
        seasonalAlignment: 0.5,
        seasonalNuance: [],
        symbolicTags: [],
        gestureLanguage: { primaryGesture: 'Radiate', family: 'Flow', intensity: 0.5, spatialFlow: 'radial' },
    },
});

export const EmotionalTagger: React.FC<EmotionalTaggerProps> = ({ addInventoryItem, grammar, addGrammarItem, initialItem }) => {
    const [stage, setStage] = useState<Stage>('upload');
    const [discoveredEmotions, setDiscoveredEmotions] = useState<Array<{ tag: string; color: string; sourceFloral: string }>>([]);
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [originalUrl, setOriginalUrl] = useState<string>('');
    const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
    const [croppedUrl, setCroppedUrl] = useState<string>('');
    const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
    const [processedUrl, setProcessedUrl] = useState<string>('');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const imgRef = useRef<HTMLImageElement>(null);

    const [editedAnalysis, setEditedAnalysis] = useState<AnalysisResult | null>(null);
    const [newEmotionTag, setNewEmotionTag] = useState('');

    const resetState = useCallback(() => {
        setStage('upload');
        setOriginalFile(null);
        setOriginalUrl('');
        setCroppedBlob(null);
        setCroppedUrl('');
        setProcessedBlob(null);
        setProcessedUrl('');
        setAnalysis(null);
        setEditedAnalysis(null);
        setCrop(undefined);
        setCompletedCrop(undefined);
        setError(null);
        setNewEmotionTag('');
        setNewEmotionTag('');
    }, []);

    // Handle initialization from Staging
    React.useEffect(() => {
        if (initialItem?.imageUrl) {
            const loadInitial = async () => {
                setIsLoading(true);
                setLoadingMessage('Loading from staging...');
                try {
                    // Fetch the image to get a blob
                    const response = await fetch(initialItem.imageUrl);
                    const blob = await response.blob();
                    const file = new File([blob], (initialItem.name || 'imported-item') + '.png', { type: blob.type });

                    resetState();
                    setOriginalFile(file);
                    setOriginalUrl(initialItem.imageUrl);
                    setStage('crop');
                } catch (e) {
                    console.error("Failed to load image from staging", e);
                    setError("Could not load image from staging area. Please try uploading manually.");
                } finally {
                    setIsLoading(false);
                }
            };
            loadInitial();
        }
    }, [initialItem]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
            resetState();
            setOriginalFile(file);
            const url = URL.createObjectURL(file);
            setOriginalUrl(url);
            setStage('crop');
        } else {
            setError('Please upload a PNG or JPEG image.');
        }
    };

    const getCroppedImg = useCallback(async (): Promise<Blob> => {
        const image = imgRef.current;
        if (!image || !completedCrop) {
            throw new Error('No crop data');
        }

        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        canvas.width = completedCrop.width * scaleX;
        canvas.height = completedCrop.height * scaleY;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No 2d context');

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            canvas.width,
            canvas.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas to blob failed'));
                },
                'image/png',
                1.0
            );
        });
    }, [completedCrop]);

    const handleCropComplete = async () => {
        try {
            setIsLoading(true);
            setLoadingMessage('Cropping image...');
            setError(null);

            let blobToProcess: Blob;

            if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
                blobToProcess = await getCroppedImg();
            } else if (originalFile) {
                blobToProcess = originalFile;
            } else {
                throw new Error('No image to process');
            }

            setCroppedBlob(blobToProcess);
            const url = URL.createObjectURL(blobToProcess);
            setCroppedUrl(url);
            setStage('remove-bg');
        } catch (err) {
            setError('Failed to crop image');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveBackground = async () => {
        if (!croppedBlob) return;

        setIsLoading(true);
        setLoadingMessage('Removing background... This may take a moment.');
        setError(null);

        try {
            if (isRemoveBgConfigured) {
                const base64 = await blobToBase64(croppedBlob);
                const mimeType = croppedBlob.type || 'image/png';
                const resultBase64 = await clearStemAgent({ base64, mimeType });
                const resultBlob = await base64ToBlob(resultBase64, 'image/png');

                setProcessedBlob(resultBlob);
                const url = URL.createObjectURL(resultBlob);
                setProcessedUrl(url);
            } else {
                throw new Error("Cloud config disabled");
            }
            setStage('analyze');
        } catch (err) {
            console.warn('Primary background removal failed:', err);
            setLoadingMessage('Cloud removal failed. Trying local fallback...');

            try {
                // Fallback to local processing
                const img = await loadImage(croppedBlob);
                const resultBlob = await removeBackground(img);

                setProcessedBlob(resultBlob);
                const url = URL.createObjectURL(resultBlob);
                setProcessedUrl(url);

                // Inform user but continue
                setError(`Notice: Cloud removal failed (${(err as Error).message}). Used basic local removal.`);
                setStage('analyze');
            } catch (fallbackErr) {
                console.error('All background removal failed:', fallbackErr);
                setError(`Background removal failed completely: ${(err as Error).message}`);
                setProcessedBlob(croppedBlob);
                setProcessedUrl(croppedUrl);
                setStage('analyze');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkipBackgroundRemoval = () => {
        if (croppedBlob) {
            setProcessedBlob(croppedBlob);
            setProcessedUrl(croppedUrl);
            setStage('analyze');
        }
    };

    const handleAnalyze = async () => {
        if (!processedBlob || !originalFile) return;

        setIsLoading(true);
        setLoadingMessage('AI is analyzing your botanical...');
        setError(null);

        try {
            const base64 = await blobToBase64(processedBlob);
            const mimeType = 'image/png';
            const imagePayload = { base64, mimeType };

            const analysisResult = await botanicalAnalysisAgent(imagePayload);
            const fragilityScore = 1.0 - analysisResult.durabilityScore;

            const featuresForEmotionMapping: VisualFeatures & { emotionalDimensions: EmotionalDimensions } = {
                ...analysisResult.visualFeatures,
                fragilityScore,
                emotionalDimensions: analysisResult.emotionalDimensions,
            };

            const imageUrl = `data:${mimeType};base64,${base64}`;
            const premium = await premiumEmotionPipeline(imageUrl, featuresForEmotionMapping, analysisResult.visualFeatures.dominantColors);

            const defaultEnhancedProps = getDefaultEnhancedProps();
            const agentEnhanced = analysisResult.enhancedProperties;
            const mergedEnhancedProps: EnhancedBotanicalProperties = {
                colorTheory: agentEnhanced?.colorTheory || defaultEnhancedProps.colorTheory,
                compositionalBehavior: agentEnhanced?.compositionalBehavior || defaultEnhancedProps.compositionalBehavior,
                narrativeMeaning: agentEnhanced?.narrativeMeaning || defaultEnhancedProps.narrativeMeaning,
                layering: agentEnhanced?.layering || defaultEnhancedProps.layering,
                tuckPoint: agentEnhanced?.tuckPoint || defaultEnhancedProps.tuckPoint,
                neighborInteraction: agentEnhanced?.neighborInteraction || defaultEnhancedProps.neighborInteraction,
                designHarmony: agentEnhanced?.designHarmony || defaultEnhancedProps.designHarmony,
                emotionalTaxonomy: agentEnhanced?.emotionalTaxonomy || defaultEnhancedProps.emotionalTaxonomy,
            };

            const result: AnalysisResult = {
                name: analysisResult.name,
                type: 'floral',
                dominantColors: analysisResult.visualFeatures.dominantColors,
                brightness: analysisResult.visualFeatures.brightness,
                shape: analysisResult.visualFeatures.shape,
                texture: analysisResult.visualFeatures.texture,
                complexity: analysisResult.visualFeatures.complexity,
                seasonTags: analysisResult.visualFeatures.seasonTags,
                culturalTags: analysisResult.visualFeatures.culturalTags,
                symbolMeaning: analysisResult.visualFeatures.symbolMeaning,
                fragilityScore,
                emotionTags: premium.tags,
                emotionalDimensions: analysisResult.emotionalDimensions,
                suggestedWidthInches: analysisResult.estimatedWidthInches ?? 4,
                suggestedHeightInches: analysisResult.estimatedHeightInches ?? 4,
                svgRepresentation: premium.svg || analysisResult.svgRepresentation,
                logicTrail: premium.logicTrail,
                enhancedProperties: mergedEnhancedProps,
                sprayProfile: analysisResult.sprayProfile,
                identificationConfidence: analysisResult.identificationConfidence ?? 0.5,
                compositionRole: analysisResult.compositionRole || 'secondary',
            };

            setAnalysis(result);
            setEditedAnalysis(result);

            // Auto-discover emotions from dominant colors
            if (grammar && addGrammarItem) {
                try {
                    const discoveries = discoverEmotionsFromColors(
                        result.dominantColors,
                        result.name,
                        grammar
                    );

                    setDiscoveredEmotions(discoveries.map(d => ({
                        tag: d.tag,
                        color: d.color,
                        sourceFloral: d.sourceFloral
                    })));

                    // Count current discovered emotions
                    const currentDiscoveredCount = grammar.filter(g => g.tier === 'discovered').length;

                    // Auto-add high-confidence discoveries
                    discoveries.forEach(d => {
                        if (shouldAutoAdd(d, currentDiscoveredCount)) {
                            addGrammarItem(discoveredToGrammarItem(d));
                        }
                    });
                } catch (e) {
                    console.warn('Emotion discovery failed:', e);
                }
            }

            setStage('calibrate');
        } catch (err) {
            console.error('Analysis failed:', err);
            setError('AI analysis failed. Please fill in details manually.');

            const defaultAnalysis: AnalysisResult = {
                name: originalFile.name.replace(/\.[^/.]+$/, '') || 'Unnamed Botanical',
                type: 'floral',
                dominantColors: ['#228B22'],
                brightness: 0.5,
                shape: 'round',
                texture: 'smooth',
                complexity: 'moderate',
                seasonTags: ['spring'],
                culturalTags: [],
                symbolMeaning: '',
                fragilityScore: 0.5,
                emotionTags: ['peaceful'],
                emotionalDimensions: { valence: 0.5, arousal: 0.5, temporalWeight: 0.5 },
                suggestedWidthInches: 4,
                suggestedHeightInches: 4,
                svgRepresentation: '',
                logicTrail: ['Manual entry'],
                enhancedProperties: getDefaultEnhancedProps(),
                identificationConfidence: 0.5,
                compositionRole: 'secondary',
            };
            setAnalysis(defaultAnalysis);
            setEditedAnalysis(defaultAnalysis);
            setStage('calibrate');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveToInventory = async () => {
        if (!processedBlob || !editedAnalysis) return;

        setIsLoading(true);
        setLoadingMessage('Saving to inventory...');
        setError(null);

        try {
            const validatedSprayProfile = editedAnalysis.sprayProfile ? {
                isSpray: editedAnalysis.sprayProfile.isSpray ?? false,
                totalElements: editedAnalysis.sprayProfile.totalElements ?? 1,
                overallWidthInches: editedAnalysis.sprayProfile.overallWidthInches ?? editedAnalysis.suggestedWidthInches,
                overallHeightInches: editedAnalysis.sprayProfile.overallHeightInches ?? editedAnalysis.suggestedHeightInches,
                usageNotes: editedAnalysis.sprayProfile.usageNotes || 'Use as single element',
                segments: (editedAnalysis.sprayProfile.segments || []).map((seg, idx) => ({
                    id: seg.id || `segment-${idx}`,
                    name: seg.name || `Element ${idx + 1}`,
                    boundingBox: seg.boundingBox || { x: 0, y: 0, width: 1, height: 1 },
                    estimatedWidthInches: seg.estimatedWidthInches ?? 3,
                    estimatedHeightInches: seg.estimatedHeightInches ?? 3,
                    role: seg.role || 'secondary',
                })),
            } : undefined;

            const item: Omit<InventoryItem, 'id' | 'imageUrl' | 'processedImageUrl' | 'originalImageUrl' | 'svgUrl'> = {
                name: editedAnalysis.name,
                type: editedAnalysis.type,
                svgRepresentation: editedAnalysis.svgRepresentation,
                dominantColors: editedAnalysis.dominantColors,
                brightness: editedAnalysis.brightness,
                shape: editedAnalysis.shape,
                texture: editedAnalysis.texture,
                complexity: editedAnalysis.complexity,
                seasonTags: editedAnalysis.seasonTags,
                culturalTags: editedAnalysis.culturalTags,
                symbolMeaning: editedAnalysis.symbolMeaning,
                fragilityScore: editedAnalysis.fragilityScore,
                compositionRole: editedAnalysis.compositionRole,
                emotionTags: editedAnalysis.emotionTags,
                emotionalDimensions: editedAnalysis.emotionalDimensions,
                logicTrail: [...editedAnalysis.logicTrail, 'User calibrated'],
                dimensions: {
                    widthInches: editedAnalysis.suggestedWidthInches,
                    heightInches: editedAnalysis.suggestedHeightInches,
                },
                isAvailable: true,
                enhancedProperties: editedAnalysis.enhancedProperties,
                sprayProfile: validatedSprayProfile,
                identificationConfidence: editedAnalysis.identificationConfidence,
            };

            try {
                const logicOut = await logicEngineAgent({
                    ...(editedAnalysis as unknown as VisualFeatures),
                    emotionalDimensions: editedAnalysis.emotionalDimensions,
                });
                if (logicOut?.category) {
                    (item as any).category = logicOut.category;
                }
            } catch (e) {
                console.warn('Category assignment failed:', e);
            }

            await addInventoryItem(item, {
                processed: processedBlob,
                original: originalFile || undefined
            });

            alert(`"${editedAnalysis.name}" added to inventory!`);
            resetState();
        } catch (err) {
            console.error('Save failed:', err);
            setError('Failed to save to inventory');
        } finally {
            setIsLoading(false);
        }
    };

    const addEmotionTag = () => {
        if (newEmotionTag.trim() && editedAnalysis) {
            setEditedAnalysis({
                ...editedAnalysis,
                emotionTags: [...editedAnalysis.emotionTags, newEmotionTag.trim()]
            });
            setNewEmotionTag('');
        }
    };

    const removeEmotionTag = (index: number) => {
        if (editedAnalysis) {
            setEditedAnalysis({
                ...editedAnalysis,
                emotionTags: editedAnalysis.emotionTags.filter((_, i) => i !== index)
            });
        }
    };

    const renderStageIndicator = () => {
        const stages: { key: Stage; label: string }[] = [
            { key: 'upload', label: 'Upload' },
            { key: 'crop', label: 'Crop' },
            { key: 'remove-bg', label: 'Remove BG' },
            { key: 'analyze', label: 'Analyze' },
            { key: 'calibrate', label: 'Calibrate' },
        ];

        const currentIndex = stages.findIndex(s => s.key === stage);

        return (
            <div className="flex items-center justify-center gap-2 mb-6">
                {stages.map((s, i) => (
                    <div key={s.key} className="flex items-center">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${i < currentIndex
                                ? 'bg-navy-600 text-white'
                                : i === currentIndex
                                    ? 'bg-navy-600 text-white ring-2 ring-navy-100'
                                    : 'bg-gray-200 text-gray-500'
                                }`}
                        >
                            {i < currentIndex ? '✓' : i + 1}
                        </div>
                        {i < stages.length - 1 && (
                            <div className={`w-8 h-0.5 mx-1 ${i < currentIndex ? 'bg-navy-600' : 'bg-gray-200'}`} />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader />
                    <p className="mt-4 text-gray-600">{loadingMessage}</p>
                </div>
            );
        }

        switch (stage) {
            case 'upload':
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-gray-800 mb-2">Upload a Botanical Image</h3>
                            <p className="text-sm text-gray-500">
                                For best results, use a clear image of a single flower or greenery.
                            </p>
                        </div>

                        <label className="block cursor-pointer">
                            <input
                                type="file"
                                onChange={handleImageUpload}
                                className="hidden"
                                accept="image/png, image/jpeg"
                            />
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-navy-500 hover:bg-navy-50/50 transition-colors">
                                <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <p className="text-gray-700 font-medium">Click to upload</p>
                                <p className="text-sm text-gray-500 mt-1">PNG or JPEG, max 10MB</p>
                            </div>
                        </label>
                    </div>
                );

            case 'crop':
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-gray-800 mb-2">Crop Your Image</h3>
                            <p className="text-sm text-gray-500">
                                Select the area containing your botanical. Skip if no cropping needed.
                            </p>
                        </div>

                        <div className="flex justify-center bg-gray-100 rounded-lg p-4">
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                            >
                                <img
                                    ref={imgRef}
                                    src={originalUrl}
                                    alt="Original"
                                    className="max-h-[400px] object-contain"
                                />
                            </ReactCrop>
                        </div>

                        <div className="flex justify-between">
                            <button onClick={resetState} className="btn">
                                ← Start Over
                            </button>
                            <button onClick={handleCropComplete} className="btn btn-primary">
                                {completedCrop?.width ? 'Apply Crop' : 'Skip Crop'} →
                            </button>
                        </div>
                    </div>
                );

            case 'remove-bg':
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-gray-800 mb-2">Remove Background</h3>
                            <p className="text-sm text-gray-500">
                                AI will remove the background for cleaner wreath designs.
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <img
                                src={croppedUrl}
                                alt="Cropped"
                                className="max-h-[300px] object-contain rounded-lg border border-gray-200"
                            />
                        </div>

                        <div className="flex justify-between">
                            <button onClick={() => setStage('crop')} className="btn">
                                ← Back
                            </button>
                            <div className="flex gap-2">
                                <button onClick={handleSkipBackgroundRemoval} className="btn">
                                    Skip
                                </button>
                                <button onClick={handleRemoveBackground} className="btn btn-primary">
                                    ✨ Remove Background →
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'analyze':
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-gray-800 mb-2">AI Analysis</h3>
                            <p className="text-sm text-gray-500">
                                Let AI identify colors, emotions, and properties.
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <div className="relative">
                                <img
                                    src={processedUrl}
                                    alt="Processed"
                                    className="max-h-[300px] object-contain rounded-lg checkered-bg"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button onClick={() => setStage('remove-bg')} className="btn">
                                ← Back
                            </button>
                            <button onClick={handleAnalyze} className="btn btn-primary">
                                ✨ Analyze with AI →
                            </button>
                        </div>
                    </div>
                );

            case 'calibrate':
                if (!editedAnalysis) return null;

                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-gray-800 mb-2">Calibrate & Save</h3>
                            <p className="text-sm text-gray-500">
                                Review and adjust the AI's analysis before saving.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex justify-center items-start">
                                <img
                                    src={processedUrl}
                                    alt="Final"
                                    className="max-h-[250px] object-contain rounded-lg checkered-bg"
                                />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={editedAnalysis.name}
                                        onChange={(e) => setEditedAnalysis({ ...editedAnalysis, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <select
                                            value={editedAnalysis.type}
                                            onChange={(e) => setEditedAnalysis({ ...editedAnalysis, type: e.target.value as any })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
                                        >
                                            <option value="floral">Floral</option>
                                            <option value="greenery">Greenery</option>
                                            <option value="accent">Accent</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Composition Role</label>
                                        <select
                                            value={editedAnalysis.compositionRole}
                                            onChange={(e) => setEditedAnalysis({ ...editedAnalysis, compositionRole: e.target.value as CompositionRole })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
                                        >
                                            {COMPOSITION_ROLES.map(r => (
                                                <option key={r} value={r}>
                                                    {r === 'focal' ? 'Focal (Main)' :
                                                        r === 'secondary' ? 'Secondary' :
                                                            r === 'filler' ? 'Filler' : 'Accent'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Shape</label>
                                        <select
                                            value={editedAnalysis.shape}
                                            onChange={(e) => setEditedAnalysis({ ...editedAnalysis, shape: e.target.value as BotanicalShape })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
                                        >
                                            {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Texture</label>
                                        <select
                                            value={editedAnalysis.texture}
                                            onChange={(e) => setEditedAnalysis({ ...editedAnalysis, texture: e.target.value as BotanicalTexture })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
                                        >
                                            {TEXTURES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Complexity</label>
                                        <select
                                            value={editedAnalysis.complexity}
                                            onChange={(e) => setEditedAnalysis({ ...editedAnalysis, complexity: e.target.value as BotanicalComplexity })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
                                        >
                                            {COMPLEXITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Width (inches)</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0.5"
                                            value={editedAnalysis.suggestedWidthInches}
                                            onChange={(e) => setEditedAnalysis({ ...editedAnalysis, suggestedWidthInches: parseFloat(e.target.value) || 1 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Height (inches)</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0.5"
                                            value={editedAnalysis.suggestedHeightInches}
                                            onChange={(e) => setEditedAnalysis({ ...editedAnalysis, suggestedHeightInches: parseFloat(e.target.value) || 1 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Spray Profile Section */}
                        {editedAnalysis.sprayProfile && editedAnalysis.sprayProfile.isSpray && (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                                <h4 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
                                    <span>Multi-Element Product</span>
                                    <span className="bg-amber-200 text-amber-800 text-xs px-2 py-1 rounded-full">
                                        {editedAnalysis.sprayProfile.totalElements} elements
                                    </span>
                                </h4>

                                <p className="text-sm text-amber-700 mb-3">
                                    {editedAnalysis.sprayProfile.usageNotes}
                                </p>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-xs text-amber-700 mb-1">Total Elements</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={editedAnalysis.sprayProfile.totalElements}
                                            onChange={(e) => setEditedAnalysis({
                                                ...editedAnalysis,
                                                sprayProfile: {
                                                    ...editedAnalysis.sprayProfile!,
                                                    totalElements: parseInt(e.target.value) || 1
                                                }
                                            })}
                                            className="w-full px-3 py-2 border border-amber-300 rounded-md focus:ring-amber-500 focus:border-amber-500 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-amber-700 mb-1">Usage Notes</label>
                                        <input
                                            type="text"
                                            value={editedAnalysis.sprayProfile.usageNotes}
                                            onChange={(e) => setEditedAnalysis({
                                                ...editedAnalysis,
                                                sprayProfile: {
                                                    ...editedAnalysis.sprayProfile!,
                                                    usageNotes: e.target.value
                                                }
                                            })}
                                            className="w-full px-3 py-2 border border-amber-300 rounded-md focus:ring-amber-500 focus:border-amber-500 bg-white"
                                        />
                                    </div>
                                </div>

                                {editedAnalysis.sprayProfile.segments && editedAnalysis.sprayProfile.segments.length > 0 && (
                                    <details className="mt-3">
                                        <summary className="text-sm text-amber-800 cursor-pointer">
                                            View {editedAnalysis.sprayProfile.segments.length} detected segments
                                        </summary>
                                        <div className="mt-2 space-y-2">
                                            {editedAnalysis.sprayProfile.segments.map((seg, idx) => (
                                                <div key={seg.id || idx} className="bg-white p-2 rounded border border-amber-200 text-sm">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium text-gray-700">{seg.name}</span>
                                                        <span className="text-xs text-amber-600 capitalize">{seg.role}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {seg.estimatedWidthInches}" × {seg.estimatedHeightInches}"
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}

                                <p className="text-xs text-amber-600 mt-3 italic">
                                    When this item is added to the blueprint, each segment can be placed individually.
                                </p>
                            </div>
                        )}

                        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                            <h4 className="font-medium text-gray-800">Emotional Dimensions</h4>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Valence</span>
                                    <span className="text-gray-500">{editedAnalysis.emotionalDimensions.valence.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={editedAnalysis.emotionalDimensions.valence}
                                    onChange={(e) => setEditedAnalysis({
                                        ...editedAnalysis,
                                        emotionalDimensions: { ...editedAnalysis.emotionalDimensions, valence: parseFloat(e.target.value) }
                                    })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Sorrow</span><span>Joy</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Arousal</span>
                                    <span className="text-gray-500">{editedAnalysis.emotionalDimensions.arousal.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={editedAnalysis.emotionalDimensions.arousal}
                                    onChange={(e) => setEditedAnalysis({
                                        ...editedAnalysis,
                                        emotionalDimensions: { ...editedAnalysis.emotionalDimensions, arousal: parseFloat(e.target.value) }
                                    })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Calm</span><span>Intense</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Temporal</span>
                                    <span className="text-gray-500">{editedAnalysis.emotionalDimensions.temporalWeight.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={editedAnalysis.emotionalDimensions.temporalWeight}
                                    onChange={(e) => setEditedAnalysis({
                                        ...editedAnalysis,
                                        emotionalDimensions: { ...editedAnalysis.emotionalDimensions, temporalWeight: parseFloat(e.target.value) }
                                    })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Past</span><span>Future</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-3">Emotion Tags</h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {editedAnalysis.emotionTags.map((tag, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-navy-50 text-navy-700 rounded-full text-sm">
                                        {tag}
                                        <button
                                            onClick={() => removeEmotionTag(i)}
                                            className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-navy-100"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newEmotionTag}
                                    onChange={(e) => setNewEmotionTag(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addEmotionTag()}
                                    placeholder="Add emotion tag..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
                                />
                                <button onClick={addEmotionTag} className="btn">Add</button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Symbolic Meaning</label>
                            <textarea
                                value={editedAnalysis.symbolMeaning}
                                onChange={(e) => setEditedAnalysis({ ...editedAnalysis, symbolMeaning: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
                                placeholder="What does this botanical symbolize?"
                            />
                        </div>

                        {/* Enhanced Properties Sections */}
                        <details className="bg-gray-50 p-4 rounded-lg">
                            <summary className="font-medium text-gray-800 cursor-pointer">Color Theory</summary>
                            <div className="mt-3 space-y-3">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Temperature</label>
                                    <select
                                        value={editedAnalysis.enhancedProperties?.colorTheory?.colorTemperature || 'neutral'}
                                        onChange={(e) => setEditedAnalysis({
                                            ...editedAnalysis,
                                            enhancedProperties: {
                                                ...editedAnalysis.enhancedProperties,
                                                colorTheory: {
                                                    ...editedAnalysis.enhancedProperties?.colorTheory!,
                                                    colorTemperature: e.target.value as ColorTemperature
                                                }
                                            }
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    >
                                        {COLOR_TEMPERATURES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </details>

                        <details className="bg-gray-50 p-4 rounded-lg">
                            <summary className="font-medium text-gray-800 cursor-pointer">Compositional Behavior</summary>
                            <div className="mt-3 space-y-3">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Visual Weight</span>
                                        <span className="text-gray-500">{(editedAnalysis.enhancedProperties?.compositionalBehavior?.visualWeight || 0.5).toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={editedAnalysis.enhancedProperties?.compositionalBehavior?.visualWeight || 0.5}
                                        onChange={(e) => setEditedAnalysis({
                                            ...editedAnalysis,
                                            enhancedProperties: {
                                                ...editedAnalysis.enhancedProperties,
                                                compositionalBehavior: {
                                                    ...editedAnalysis.enhancedProperties?.compositionalBehavior!,
                                                    visualWeight: parseFloat(e.target.value)
                                                }
                                            }
                                        })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Light/Airy</span><span>Heavy/Anchoring</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Directional Energy</label>
                                    <select
                                        value={editedAnalysis.enhancedProperties?.compositionalBehavior?.directionalEnergy || 'outward'}
                                        onChange={(e) => setEditedAnalysis({
                                            ...editedAnalysis,
                                            enhancedProperties: {
                                                ...editedAnalysis.enhancedProperties,
                                                compositionalBehavior: {
                                                    ...editedAnalysis.enhancedProperties?.compositionalBehavior!,
                                                    directionalEnergy: e.target.value as DirectionalEnergy
                                                }
                                            }
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    >
                                        {DIRECTIONAL_ENERGIES.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                        </details>

                        <details className="bg-gray-50 p-4 rounded-lg">
                            <summary className="font-medium text-gray-800 cursor-pointer">Narrative / Meaning</summary>
                            <div className="mt-3 space-y-3">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Grief Suitability</span>
                                        <span className="text-gray-500">{(editedAnalysis.enhancedProperties?.narrativeMeaning?.griefSuitability || 0.5).toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={editedAnalysis.enhancedProperties?.narrativeMeaning?.griefSuitability || 0.5}
                                        onChange={(e) => setEditedAnalysis({
                                            ...editedAnalysis,
                                            enhancedProperties: {
                                                ...editedAnalysis.enhancedProperties,
                                                narrativeMeaning: {
                                                    ...editedAnalysis.enhancedProperties?.narrativeMeaning!,
                                                    griefSuitability: parseFloat(e.target.value)
                                                }
                                            }
                                        })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Celebration Suitability</span>
                                        <span className="text-gray-500">{(editedAnalysis.enhancedProperties?.narrativeMeaning?.celebrationSuitability || 0.5).toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={editedAnalysis.enhancedProperties?.narrativeMeaning?.celebrationSuitability || 0.5}
                                        onChange={(e) => setEditedAnalysis({
                                            ...editedAnalysis,
                                            enhancedProperties: {
                                                ...editedAnalysis.enhancedProperties,
                                                narrativeMeaning: {
                                                    ...editedAnalysis.enhancedProperties?.narrativeMeaning!,
                                                    celebrationSuitability: parseFloat(e.target.value)
                                                }
                                            }
                                        })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Romantic Suitability</span>
                                        <span className="text-gray-500">{(editedAnalysis.enhancedProperties?.narrativeMeaning?.romanticSuitability || 0.5).toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={editedAnalysis.enhancedProperties?.narrativeMeaning?.romanticSuitability || 0.5}
                                        onChange={(e) => setEditedAnalysis({
                                            ...editedAnalysis,
                                            enhancedProperties: {
                                                ...editedAnalysis.enhancedProperties,
                                                narrativeMeaning: {
                                                    ...editedAnalysis.enhancedProperties?.narrativeMeaning!,
                                                    romanticSuitability: parseFloat(e.target.value)
                                                }
                                            }
                                        })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                        </details>

                        <details className="bg-gray-50 p-4 rounded-lg">
                            <summary className="font-medium text-gray-800 cursor-pointer">Layering (Z-Axis)</summary>
                            <div className="mt-3 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Depth Layer</label>
                                        <select
                                            value={editedAnalysis.enhancedProperties?.layering?.depthLayer || 'mid-ground'}
                                            onChange={(e) => setEditedAnalysis({
                                                ...editedAnalysis,
                                                enhancedProperties: {
                                                    ...editedAnalysis.enhancedProperties,
                                                    layering: {
                                                        ...editedAnalysis.enhancedProperties?.layering!,
                                                        depthLayer: e.target.value as DepthLayer
                                                    }
                                                }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            {DEPTH_LAYERS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Stacking</label>
                                        <select
                                            value={editedAnalysis.enhancedProperties?.layering?.stackingBehavior || 'builds-on'}
                                            onChange={(e) => setEditedAnalysis({
                                                ...editedAnalysis,
                                                enhancedProperties: {
                                                    ...editedAnalysis.enhancedProperties,
                                                    layering: {
                                                        ...editedAnalysis.enhancedProperties?.layering!,
                                                        stackingBehavior: e.target.value as StackingBehavior
                                                    }
                                                }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            {STACKING_BEHAVIORS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Overlap Tolerance</span>
                                        <span className="text-gray-500">{(editedAnalysis.enhancedProperties?.layering?.overlapTolerance || 0.5).toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={editedAnalysis.enhancedProperties?.layering?.overlapTolerance || 0.5}
                                        onChange={(e) => setEditedAnalysis({
                                            ...editedAnalysis,
                                            enhancedProperties: {
                                                ...editedAnalysis.enhancedProperties,
                                                layering: {
                                                    ...editedAnalysis.enhancedProperties?.layering!,
                                                    overlapTolerance: parseFloat(e.target.value)
                                                }
                                            }
                                        })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                        </details>

                        <details className="bg-gray-50 p-4 rounded-lg">
                            <summary className="font-medium text-gray-800 cursor-pointer">Tuck Point Properties</summary>
                            <div className="mt-3 space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Stem Style</label>
                                        <select
                                            value={editedAnalysis.enhancedProperties?.tuckPoint?.stemStyle || 'single'}
                                            onChange={(e) => setEditedAnalysis({
                                                ...editedAnalysis,
                                                enhancedProperties: {
                                                    ...editedAnalysis.enhancedProperties,
                                                    tuckPoint: {
                                                        ...editedAnalysis.enhancedProperties?.tuckPoint!,
                                                        stemStyle: e.target.value as StemStyle
                                                    }
                                                }
                                            })}
                                            className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            {STEM_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Tuck Depth</label>
                                        <select
                                            value={editedAnalysis.enhancedProperties?.tuckPoint?.tuckDepth || 'medium'}
                                            onChange={(e) => setEditedAnalysis({
                                                ...editedAnalysis,
                                                enhancedProperties: {
                                                    ...editedAnalysis.enhancedProperties,
                                                    tuckPoint: {
                                                        ...editedAnalysis.enhancedProperties?.tuckPoint!,
                                                        tuckDepth: e.target.value as TuckDepth
                                                    }
                                                }
                                            })}
                                            className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            {TUCK_DEPTHS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Angle</label>
                                        <select
                                            value={editedAnalysis.enhancedProperties?.tuckPoint?.insertionAngle || 'angled'}
                                            onChange={(e) => setEditedAnalysis({
                                                ...editedAnalysis,
                                                enhancedProperties: {
                                                    ...editedAnalysis.enhancedProperties,
                                                    tuckPoint: {
                                                        ...editedAnalysis.enhancedProperties?.tuckPoint!,
                                                        insertionAngle: e.target.value as InsertionAngle
                                                    }
                                                }
                                            })}
                                            className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            {INSERTION_ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Gap Filler Score</span>
                                        <span className="text-gray-500">{(editedAnalysis.enhancedProperties?.tuckPoint?.gapFillerScore || 0.5).toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={editedAnalysis.enhancedProperties?.tuckPoint?.gapFillerScore || 0.5}
                                        onChange={(e) => setEditedAnalysis({
                                            ...editedAnalysis,
                                            enhancedProperties: {
                                                ...editedAnalysis.enhancedProperties,
                                                tuckPoint: {
                                                    ...editedAnalysis.enhancedProperties?.tuckPoint!,
                                                    gapFillerScore: parseFloat(e.target.value)
                                                }
                                            }
                                        })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Focal (Low)</span><span>Filler (High)</span>
                                    </div>
                                </div>
                            </div>
                        </details>

                        <details className="bg-gray-50 p-4 rounded-lg">
                            <summary className="font-medium text-gray-800 cursor-pointer">Neighbor Interaction</summary>
                            <div className="mt-3 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Spacing</label>
                                        <select
                                            value={editedAnalysis.enhancedProperties?.neighborInteraction?.spacingPreference || 'medium'}
                                            onChange={(e) => setEditedAnalysis({
                                                ...editedAnalysis,
                                                enhancedProperties: {
                                                    ...editedAnalysis.enhancedProperties,
                                                    neighborInteraction: {
                                                        ...editedAnalysis.enhancedProperties?.neighborInteraction!,
                                                        spacingPreference: e.target.value as SpacingPreference
                                                    }
                                                }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            {SPACING_PREFERENCES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Role</label>
                                        <select
                                            value={editedAnalysis.enhancedProperties?.neighborInteraction?.transitionRole || 'bridge'}
                                            onChange={(e) => setEditedAnalysis({
                                                ...editedAnalysis,
                                                enhancedProperties: {
                                                    ...editedAnalysis.enhancedProperties,
                                                    neighborInteraction: {
                                                        ...editedAnalysis.enhancedProperties?.neighborInteraction!,
                                                        transitionRole: e.target.value as TransitionRole
                                                    }
                                                }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            {TRANSITION_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Clustering Compatibility</span>
                                        <span className="text-gray-500">{(editedAnalysis.enhancedProperties?.neighborInteraction?.clusteringCompatibility || 0.5).toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={editedAnalysis.enhancedProperties?.neighborInteraction?.clusteringCompatibility || 0.5}
                                        onChange={(e) => setEditedAnalysis({
                                            ...editedAnalysis,
                                            enhancedProperties: {
                                                ...editedAnalysis.enhancedProperties,
                                                neighborInteraction: {
                                                    ...editedAnalysis.enhancedProperties?.neighborInteraction!,
                                                    clusteringCompatibility: parseFloat(e.target.value)
                                                }
                                            }
                                        })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Needs Space</span><span>Clusters Well</span>
                                    </div>
                                </div>
                            </div>
                        </details>

                        <details className="bg-gray-50 p-4 rounded-lg">
                            <summary className="font-medium text-gray-800 cursor-pointer">Design Harmony</summary>
                            <div className="mt-3 space-y-3">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Layer Role</label>
                                    <select
                                        value={editedAnalysis.enhancedProperties?.designHarmony?.layerRole || 'filler'}
                                        onChange={(e) => setEditedAnalysis({
                                            ...editedAnalysis,
                                            enhancedProperties: {
                                                ...editedAnalysis.enhancedProperties,
                                                designHarmony: {
                                                    ...(editedAnalysis.enhancedProperties?.designHarmony || { harmonicPairings: [], contrastSuggestions: [], layerRole: 'filler' }),
                                                    layerRole: e.target.value as LayerRole
                                                }
                                            }
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    >
                                        {LAYER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Harmonic Pairings (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={(editedAnalysis.enhancedProperties?.designHarmony?.harmonicPairings || []).join(', ')}
                                        onChange={(e) => setEditedAnalysis({
                                            ...editedAnalysis,
                                            enhancedProperties: {
                                                ...editedAnalysis.enhancedProperties,
                                                designHarmony: {
                                                    ...(editedAnalysis.enhancedProperties?.designHarmony || { harmonicPairings: [], contrastSuggestions: [], layerRole: 'filler' }),
                                                    harmonicPairings: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                                }
                                            }
                                        })}
                                        placeholder="e.g., eucalyptus, baby's breath"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Contrast Suggestions (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={(editedAnalysis.enhancedProperties?.designHarmony?.contrastSuggestions || []).join(', ')}
                                        onChange={(e) => setEditedAnalysis({
                                            ...editedAnalysis,
                                            enhancedProperties: {
                                                ...editedAnalysis.enhancedProperties,
                                                designHarmony: {
                                                    ...(editedAnalysis.enhancedProperties?.designHarmony || { harmonicPairings: [], contrastSuggestions: [], layerRole: 'filler' }),
                                                    contrastSuggestions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                                }
                                            }
                                        })}
                                        placeholder="e.g., dark greenery, burgundy roses"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                            </div>
                        </details>

                        <details className="bg-gray-50 p-4 rounded-lg">
                            <summary className="font-medium text-gray-800 cursor-pointer">Emotional Taxonomy & Gesture</summary>
                            <div className="mt-3 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Emotional Family</label>
                                        <select
                                            value={editedAnalysis.enhancedProperties?.emotionalTaxonomy?.emotionalFamily || 'Neutral'}
                                            onChange={(e) => setEditedAnalysis({
                                                ...editedAnalysis,
                                                enhancedProperties: {
                                                    ...editedAnalysis.enhancedProperties,
                                                    emotionalTaxonomy: {
                                                        ...(editedAnalysis.enhancedProperties?.emotionalTaxonomy || {
                                                            primaryEmotion: 'Neutral', emotionalFamily: 'Neutral', intensity: 0.5,
                                                            complexity: 0.3, resonanceScore: 0.5, seasonalAlignment: 0.5,
                                                            seasonalNuance: [], symbolicTags: [],
                                                            gestureLanguage: { primaryGesture: 'Radiate', family: 'Flow', intensity: 0.5, spatialFlow: 'radial' }
                                                        }),
                                                        emotionalFamily: e.target.value as EmotionalFamily
                                                    }
                                                }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            {EMOTIONAL_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Primary Emotion</label>
                                        <input
                                            type="text"
                                            value={editedAnalysis.enhancedProperties?.emotionalTaxonomy?.primaryEmotion || 'Neutral'}
                                            onChange={(e) => setEditedAnalysis({
                                                ...editedAnalysis,
                                                enhancedProperties: {
                                                    ...editedAnalysis.enhancedProperties,
                                                    emotionalTaxonomy: {
                                                        ...(editedAnalysis.enhancedProperties?.emotionalTaxonomy || {
                                                            primaryEmotion: 'Neutral', emotionalFamily: 'Neutral', intensity: 0.5,
                                                            complexity: 0.3, resonanceScore: 0.5, seasonalAlignment: 0.5,
                                                            seasonalNuance: [], symbolicTags: [],
                                                            gestureLanguage: { primaryGesture: 'Radiate', family: 'Flow', intensity: 0.5, spatialFlow: 'radial' }
                                                        }),
                                                        primaryEmotion: e.target.value
                                                    }
                                                }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Resonance Score</span>
                                        <span className="text-gray-500">{(editedAnalysis.enhancedProperties?.emotionalTaxonomy?.resonanceScore || 0.5).toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={editedAnalysis.enhancedProperties?.emotionalTaxonomy?.resonanceScore || 0.5}
                                        onChange={(e) => setEditedAnalysis({
                                            ...editedAnalysis,
                                            enhancedProperties: {
                                                ...editedAnalysis.enhancedProperties,
                                                emotionalTaxonomy: {
                                                    ...(editedAnalysis.enhancedProperties?.emotionalTaxonomy || {
                                                        primaryEmotion: 'Neutral', emotionalFamily: 'Neutral', intensity: 0.5,
                                                        complexity: 0.3, resonanceScore: 0.5, seasonalAlignment: 0.5,
                                                        seasonalNuance: [], symbolicTags: [],
                                                        gestureLanguage: { primaryGesture: 'Radiate', family: 'Flow', intensity: 0.5, spatialFlow: 'radial' }
                                                    }),
                                                    resonanceScore: parseFloat(e.target.value)
                                                }
                                            }
                                        })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Niche</span><span>Universal</span>
                                    </div>
                                </div>
                                <div className="border-t pt-3 mt-2">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Gesture Language</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Gesture</label>
                                            <select
                                                value={editedAnalysis.enhancedProperties?.emotionalTaxonomy?.gestureLanguage?.primaryGesture || 'Radiate'}
                                                onChange={(e) => {
                                                    const current = editedAnalysis.enhancedProperties?.emotionalTaxonomy || {
                                                        primaryEmotion: 'Neutral', emotionalFamily: 'Neutral' as EmotionalFamily, intensity: 0.5,
                                                        complexity: 0.3, resonanceScore: 0.5, seasonalAlignment: 0.5,
                                                        seasonalNuance: [], symbolicTags: [],
                                                        gestureLanguage: { primaryGesture: 'Radiate' as GesturePrimary, family: 'Flow' as GestureFamily, intensity: 0.5, spatialFlow: 'radial' as SpatialFlow }
                                                    };
                                                    setEditedAnalysis({
                                                        ...editedAnalysis,
                                                        enhancedProperties: {
                                                            ...editedAnalysis.enhancedProperties,
                                                            emotionalTaxonomy: {
                                                                ...current,
                                                                gestureLanguage: {
                                                                    ...current.gestureLanguage,
                                                                    primaryGesture: e.target.value as GesturePrimary
                                                                }
                                                            }
                                                        }
                                                    });
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            >
                                                {GESTURE_PRIMARIES.map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Family</label>
                                            <select
                                                value={editedAnalysis.enhancedProperties?.emotionalTaxonomy?.gestureLanguage?.family || 'Flow'}
                                                onChange={(e) => {
                                                    const current = editedAnalysis.enhancedProperties?.emotionalTaxonomy || {
                                                        primaryEmotion: 'Neutral', emotionalFamily: 'Neutral' as EmotionalFamily, intensity: 0.5,
                                                        complexity: 0.3, resonanceScore: 0.5, seasonalAlignment: 0.5,
                                                        seasonalNuance: [], symbolicTags: [],
                                                        gestureLanguage: { primaryGesture: 'Radiate' as GesturePrimary, family: 'Flow' as GestureFamily, intensity: 0.5, spatialFlow: 'radial' as SpatialFlow }
                                                    };
                                                    setEditedAnalysis({
                                                        ...editedAnalysis,
                                                        enhancedProperties: {
                                                            ...editedAnalysis.enhancedProperties,
                                                            emotionalTaxonomy: {
                                                                ...current,
                                                                gestureLanguage: {
                                                                    ...current.gestureLanguage,
                                                                    family: e.target.value as GestureFamily
                                                                }
                                                            }
                                                        }
                                                    });
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            >
                                                {GESTURE_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Spatial Flow</label>
                                            <select
                                                value={editedAnalysis.enhancedProperties?.emotionalTaxonomy?.gestureLanguage?.spatialFlow || 'radial'}
                                                onChange={(e) => {
                                                    const current = editedAnalysis.enhancedProperties?.emotionalTaxonomy || {
                                                        primaryEmotion: 'Neutral', emotionalFamily: 'Neutral' as EmotionalFamily, intensity: 0.5,
                                                        complexity: 0.3, resonanceScore: 0.5, seasonalAlignment: 0.5,
                                                        seasonalNuance: [], symbolicTags: [],
                                                        gestureLanguage: { primaryGesture: 'Radiate' as GesturePrimary, family: 'Flow' as GestureFamily, intensity: 0.5, spatialFlow: 'radial' as SpatialFlow }
                                                    };
                                                    setEditedAnalysis({
                                                        ...editedAnalysis,
                                                        enhancedProperties: {
                                                            ...editedAnalysis.enhancedProperties,
                                                            emotionalTaxonomy: {
                                                                ...current,
                                                                gestureLanguage: {
                                                                    ...current.gestureLanguage,
                                                                    spatialFlow: e.target.value as SpatialFlow
                                                                }
                                                            }
                                                        }
                                                    });
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            >
                                                {SPATIAL_FLOWS.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Intensity</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={editedAnalysis.enhancedProperties?.emotionalTaxonomy?.gestureLanguage?.intensity || 0.5}
                                                onChange={(e) => {
                                                    const current = editedAnalysis.enhancedProperties?.emotionalTaxonomy || {
                                                        primaryEmotion: 'Neutral', emotionalFamily: 'Neutral' as EmotionalFamily, intensity: 0.5,
                                                        complexity: 0.3, resonanceScore: 0.5, seasonalAlignment: 0.5,
                                                        seasonalNuance: [], symbolicTags: [],
                                                        gestureLanguage: { primaryGesture: 'Radiate' as GesturePrimary, family: 'Flow' as GestureFamily, intensity: 0.5, spatialFlow: 'radial' as SpatialFlow }
                                                    };
                                                    setEditedAnalysis({
                                                        ...editedAnalysis,
                                                        enhancedProperties: {
                                                            ...editedAnalysis.enhancedProperties,
                                                            emotionalTaxonomy: {
                                                                ...current,
                                                                gestureLanguage: {
                                                                    ...current.gestureLanguage,
                                                                    intensity: parseFloat(e.target.value)
                                                                }
                                                            }
                                                        }
                                                    });
                                                }}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        <div className="flex justify-between pt-4">
                            <button onClick={() => setStage('analyze')} className="btn">
                                ← Back
                            </button>
                            <button onClick={handleSaveToInventory} className="btn btn-primary">
                                ✓ Save to Inventory
                            </button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-3xl mx-auto">
            <h2 className="text-2xl font-serif text-gray-800 mb-4 text-center">Emotional Tagger</h2>

            {renderStageIndicator()}

            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {renderContent()}
        </div>
    );
};
