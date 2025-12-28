import React, { useState, useEffect, useCallback } from 'react';
import type {
    WreathBlueprint,
    InventoryItem,
    EmotionalGrammarItem,
    BlueprintSchematic,
    UserStyleProfile,
    ImageUpload,
    NarrativeContent,
    ManufacturingSpec,
    MemoryName,
    ComplementarySuggestion,
    DesignDrop,
} from './types';
import { cloudSyncService, type ProjectData } from './services/cloudSyncService';
import { storage, isFirebaseConfigured } from './services/firebaseConfig';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { createDefaultGrammar } from './lib/defaultGrammar';
import { sanitizeBlueprintForSerialization } from './lib/blueprintUtils';
import {
    coordinatorAgent,
    type CoordinationRequest,
    type CoordinatedOutput,
    formatCoordinatorLog,
    getCoordinatorStats,
} from './services/coordinatorAgent';
import { MemoryInputForm } from './components/MemoryInputForm';
import { WreathDisplay } from './components/WreathDisplay';
import { EmotionalTagger } from './components/EmotionalTagger';
import { InventoryDashboard } from './components/InventoryDashboard';
import { BlueprintArchitect } from './components/BlueprintArchitect';
import { BlueprintLibrary } from './components/BlueprintLibrary';
import { BlueprintStudio } from './components/BlueprintStudio';
import { EmotionalGrammarEditor } from './components/EmotionalGrammarEditor';
import { StyleProfileEditor } from './components/StyleProfileEditor';
import { Loader } from './components/Loader';
import { FirebaseConfigNeeded } from './components/FirebaseConfigNeeded';
import { AgentDashboard } from './components/AgentDashboard';
import { DashboardWiring } from './components/DashboardWiring';
import { DesignDrops } from './components/DesignDrops';
import { FIREBASE_FUNCTIONS_BASE_URL } from './services/config';
const VisionAgentTester = React.lazy(() => import('./components/VisionAgentTester').then((m) => ({ default: m.VisionAgentTester })));
const EnhancedFloralDemo = React.lazy(() => import('./components/EnhancedFloralDemo').then((m) => ({ default: m.EnhancedFloralDemo })));

type AppView =
    | 'creator'
    | 'display'
    | 'tagger'
    | 'inventory'
    | 'architect'
    | 'library'
    | 'studio'
    | 'grammar'
    | 'profile'
    | 'dashboard'
    | 'vision-test'
    | 'enhanced-demo'
    | 'dashboard-wiring'
    | 'drops';

const App: React.FC = () => {
    const [view, setView] = useState<AppView>('creator');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'learning'>('synced');
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [blueprints, setBlueprints] = useState<WreathBlueprint[]>([]);
    const [grammar, setGrammar] = useState<EmotionalGrammarItem[]>([]);
    const [schematics, setSchematics] = useState<BlueprintSchematic[]>([]);
    const [styleProfile, setStyleProfile] = useState<UserStyleProfile | null>(null);
    const [designDrops, setDesignDrops] = useState<DesignDrop[]>([]);
    const [generatedBlueprint, setGeneratedBlueprint] = useState<WreathBlueprint | null>(null);
    const [activeBlueprint, setActiveBlueprint] = useState<WreathBlueprint | null>(null);
    const [coordinatorOutput, setCoordinatorOutput] = useState<CoordinatedOutput | null>(null);
    const [selectedNameOption, setSelectedNameOption] = useState<string | null>(null);
    const [isCoordinatorProcessing, setIsCoordinatorProcessing] = useState(false);
    const [coordinatorError, setCoordinatorError] = useState<string | null>(null);

    // Melrose CSV lookup database for extension imports
    const [melroseCsvLookup, setMelroseCsvLookup] = useState<Map<string, InventoryItem>>(new Map());

    // Import staging area - products wait here for tagging before going to inventory
    const [importStaging, setImportStaging] = useState<InventoryItem[]>([]);
    const [taggerInitialItem, setTaggerInitialItem] = useState<InventoryItem | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!isFirebaseConfigured) {
                const stored = localStorage.getItem('wreath-weaver-project');
                if (stored) {
                    try {
                        const data = JSON.parse(stored);
                        setInventory(data.inventory);
                        setBlueprints(data.blueprints);
                        setGrammar(data.grammar?.length ?? 0 > 0 ? data.grammar : createDefaultGrammar());
                        setSchematics(data.schematics);
                        setStyleProfile(data.styleProfile ?? null);
                        setDesignDrops(data.designDrops ?? []);
                        setHasLoadedOnce(true);
                    } catch (e) {
                        setGrammar(createDefaultGrammar());
                        setHasLoadedOnce(true);
                    }
                } else {
                    setGrammar(createDefaultGrammar());
                    setHasLoadedOnce(true);
                }
                setIsLoading(false);
                return;
            }

            try {
                const data = await cloudSyncService.loadProject();
                if (data) {
                    setInventory(data.inventory);
                    setBlueprints(data.blueprints);
                    setGrammar(data.grammar.length > 0 ? data.grammar : createDefaultGrammar());
                    setSchematics(data.schematics);
                    setStyleProfile(data.styleProfile ?? null);
                    setDesignDrops(data.designDrops ?? []);
                    setHasLoadedOnce(true);
                } else {
                    const stored = localStorage.getItem('wreath-weaver-project');
                    if (stored) {
                        try {
                            const parsed = JSON.parse(stored);
                            setInventory(parsed.inventory);
                            setBlueprints(parsed.blueprints);
                            setGrammar(parsed.grammar?.length ?? 0 > 0 ? parsed.grammar : createDefaultGrammar());
                            setSchematics(parsed.schematics);
                            setStyleProfile(parsed.styleProfile ?? null);
                            setDesignDrops(parsed.designDrops ?? []);
                            setHasLoadedOnce(true);
                        } catch (e) {
                            setGrammar(createDefaultGrammar());
                            setHasLoadedOnce(true);
                        }
                    } else {
                        setGrammar(createDefaultGrammar());
                        setHasLoadedOnce(true);
                    }
                }
            } catch (error) {
                const stored = localStorage.getItem('wreath-weaver-project');
                if (stored) {
                    try {
                        const data = JSON.parse(stored);
                        setInventory(data.inventory);
                        setBlueprints(data.blueprints);
                        setGrammar(data.grammar?.length ?? 0 > 0 ? data.grammar : createDefaultGrammar());
                        setSchematics(data.schematics);
                        setStyleProfile(data.styleProfile ?? null);
                        setDesignDrops(data.designDrops ?? []);
                        setHasLoadedOnce(true);
                    } catch (e) {
                        setGrammar(createDefaultGrammar());
                        setHasLoadedOnce(true);
                    }
                } else {
                    setGrammar(createDefaultGrammar());
                    setHasLoadedOnce(true);
                }
                setSyncStatus('error');
                setLoadError(true);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        if (isLoading || !hasLoadedOnce) return;

        const projectData: ProjectData = {
            inventory,
            blueprints: blueprints.map((bp) => sanitizeBlueprintForSerialization(bp as WreathBlueprint)) as WreathBlueprint[],
            grammar,
            schematics,
            styleProfile,
            designDrops,
        };

        try {
            localStorage.setItem('wreath-weaver-project', JSON.stringify(projectData));
        } catch (e) {
            console.warn('[Storage] localStorage quota exceeded, skipping local save');
        }

        if (isFirebaseConfigured && !loadError) {
            setSyncStatus('syncing');
            cloudSyncService
                .saveProject(projectData)
                .then(() => {
                    setSyncStatus('synced');
                })
                .catch(() => {
                    setSyncStatus('error');
                });
        }
    }, [inventory, blueprints, grammar, schematics, styleProfile, designDrops, isLoading, hasLoadedOnce, loadError]);

    useEffect(() => {
        if (isLoading || loadError || !isFirebaseConfigured || !hasLoadedOnce || syncStatus === 'syncing' || syncStatus === 'learning') {
            return;
        }

        const projectData: ProjectData = {
            inventory,
            blueprints: blueprints.map((bp) => sanitizeBlueprintForSerialization(bp as WreathBlueprint)) as WreathBlueprint[],
            grammar,
            schematics,
            styleProfile,
            designDrops,
        };

        setSyncStatus('syncing');
        const timer = setTimeout(() => {
            try {
                localStorage.setItem('wreath-weaver-project', JSON.stringify(projectData));
            } catch (e) {
                console.warn('[Storage] localStorage quota exceeded, skipping local save');
            }
            cloudSyncService
                .saveProject(projectData)
                .then(() => {
                    setSyncStatus('synced');
                })
                .catch(() => {
                    setSyncStatus('error');
                });
        }, 1500);

        return () => clearTimeout(timer);
    }, [inventory, blueprints, grammar, schematics, styleProfile, designDrops, isLoading, syncStatus, loadError, hasLoadedOnce]);

    // Listen for Chrome extension product imports
    // - Melrose sites: uses CSV lookup for full dropship data
    // - Other sites: imports directly with scraped data
    useEffect(() => {
        const handleExtensionMessage = (event: MessageEvent) => {
            if (event.data?.type === 'WREATH_WEAVER_EXTENSION_IMPORT' && Array.isArray(event.data.products)) {
                const products = event.data.products;
                console.log('📦 Received products from extension:', products.length);

                let importedCount = 0;
                let alreadyInInventory = 0;
                let notFoundInCsv = 0;
                let directImportCount = 0;
                const notFoundSkus: string[] = [];
                const newItems: InventoryItem[] = [];

                products.forEach((p: any, idx: number) => {
                    const sku = p.sku?.trim()?.toLowerCase();
                    const source = p.source?.toLowerCase() || '';
                    const isMelrose = source.includes('melrose');

                    // Check if already in inventory (by SKU if available, or by name)
                    const existingInInventory = sku
                        ? inventory.find(item => item.melroseInfo?.vendorSku?.toLowerCase() === sku)
                        : inventory.find(item => item.name?.toLowerCase() === p.name?.toLowerCase());

                    if (existingInInventory) {
                        console.log(`⏭️ Already in inventory: ${sku || p.name}`);
                        alreadyInInventory++;
                        return;
                    }

                    // MELROSE: Try CSV lookup first
                    if (isMelrose && melroseCsvLookup.size > 0 && sku) {
                        const csvItem = melroseCsvLookup.get(sku);

                        if (csvItem) {
                            const newItem: InventoryItem = {
                                ...csvItem,
                                id: `ext-${Date.now()}-${idx}`,
                                imageUrl: p.imageUrl || csvItem.imageUrl,
                                processedImageUrl: p.imageUrl || csvItem.processedImageUrl,
                                logicTrail: [
                                    `Imported via Chrome extension`,
                                    `SKU: ${csvItem.melroseInfo?.vendorSku}`,
                                    `Full data from Melrose CSV`
                                ],
                            };
                            newItems.push(newItem);
                            importedCount++;
                            console.log(`✅ Melrose CSV match: ${sku} → ${csvItem.name}`);
                            return;
                        } else {
                            notFoundInCsv++;
                            notFoundSkus.push(sku);
                            console.log(`❌ Melrose SKU not in CSV: ${sku}`);
                            return; // Don't import incomplete Melrose data
                        }
                    }

                    // NON-MELROSE or no CSV: Import directly with scraped data
                    // REQUIRE IMAGE - skip if no image
                    if (!p.imageUrl) {
                        console.log(`⚠️ Skipped ${p.name}: no image`);
                        return; // Skip products without images
                    }

                    const newItem: InventoryItem = {
                        id: `ext-${Date.now()}-${idx}`,
                        name: p.name || 'Imported Product',
                        type: 'accent' as const,
                        imageUrl: p.imageUrl,
                        processedImageUrl: p.imageUrl,
                        svgRepresentation: '',
                        dimensions: { widthInches: 4, heightInches: 4 },
                        emotionTags: [],
                        emotionalDimensions: { valence: 0.5, arousal: 0.5, temporalWeight: 0.5 },
                        logicTrail: [
                            `Imported from ${p.source || 'extension'}`,
                            `SKU: ${sku || 'N/A'}`,
                            p.productUrl ? `URL: ${p.productUrl}` : '',
                            '⏳ Awaiting image tagging'
                        ].filter(Boolean),
                        isAvailable: true,
                        dominantColors: [],
                        brightness: 0.5,
                        shape: 'other' as const,
                        texture: 'smooth' as const,
                        complexity: 'moderate' as const,
                        seasonTags: [],
                        culturalTags: [],
                        symbolMeaning: p.description || '',
                        fragilityScore: 0.5,
                        inventoryCategory: 'home' as const,
                        melroseInfo: {
                            vendorSku: sku || '',
                            upcCode: '',
                            productCategory: 'Imported' as any,
                            webTitle: p.name || '',
                            marketingCopy: p.description || '',
                            materials: [],
                            color: '',
                            dimensions: { length: 0, width: 0, height: 0, uom: 'in' },
                            weight: 0,
                            weightUom: 'lbs',
                            shippingDimensions: { length: 0, width: 0, height: 0, weight: 0, uom: 'in', weightUom: 'lbs' },
                            country: '',
                            setQuantity: 1,
                            shipVia: '',
                            dropshipPrice: p.price || 0,
                            dropshipFreightIncludedPrice: p.price || 0,
                            msrp: (p.price || 0) * 2,
                            availability: 1,
                            imageUrls: p.additionalImages || [p.imageUrl].filter(Boolean),
                            status: 'Active',
                        } as any,
                    };
                    newItems.push(newItem);
                    directImportCount++;
                    console.log(`📦 To staging: ${p.name} from ${p.source}`);
                });

                // Add new items to STAGING (not inventory) - they need tagging first
                if (newItems.length > 0) {
                    setImportStaging(prev => [...prev, ...newItems]);
                }

                // Show results
                let message = `📦 Import Results:\n\n`;
                if (importedCount > 0) {
                    message += `✅ ${importedCount} from Melrose CSV → Inventory\n`;
                }
                if (directImportCount > 0) {
                    message += `📥 ${directImportCount} → Staging (needs tagging)\n`;
                }
                if (alreadyInInventory > 0) {
                    message += `⏭️ ${alreadyInInventory} already in inventory\n`;
                }
                if (notFoundInCsv > 0) {
                    message += `❌ ${notFoundInCsv} Melrose SKU(s) not in CSV\n`;
                    if (notFoundSkus.length <= 3) {
                        message += `   (${notFoundSkus.join(', ')})\n`;
                    }
                }
                if (importedCount === 0 && directImportCount === 0 && alreadyInInventory === 0 && notFoundInCsv === 0) {
                    message = 'No products to import (images required!)';
                }
                if (directImportCount > 0) {
                    message += '\n💡 Go to Inventory → Staging to tag and approve';
                }
                alert(message);
            }
        };

        window.addEventListener('message', handleExtensionMessage);
        return () => window.removeEventListener('message', handleExtensionMessage);
    }, [inventory, melroseCsvLookup]);

    const handleGenerateWreath = async (memory: string, baseImage: string | null) => {
        setIsGenerating(true);
        setIsCoordinatorProcessing(true);
        setCoordinatorError(null);
        setCoordinatorOutput(null);

        try {
            let imagePayload: ImageUpload | null = null;
            if (baseImage) {
                const [header, data] = baseImage.split(',');
                const mimeMatch = header.match(/data:([^;]+)/);
                const mimeType = mimeMatch?.[1] || 'image/png';
                if (data && mimeType) {
                    imagePayload = { base64: data, mimeType };
                }
            }

            const output = await coordinatorAgent(
                {
                    memory,
                    inventory: inventory.filter((i) => i.isAvailable),
                    styleProfile,
                    baseImage: imagePayload,
                    userPreferences: {
                        includeNarrative: true,
                        generate3D: false,
                        generateNames: true,
                        generateSuggestions: true,
                    },
                },
                { verbose: true }
            );

            setCoordinatorOutput(output);
            setGeneratedBlueprint(output.blueprint);
            setView('display');
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            setCoordinatorError(errorMsg);
            alert(`Sorry, there was an error designing your wreath:\n\n${errorMsg}\n\nPlease try again.`);
        } finally {
            setIsGenerating(false);
            setIsCoordinatorProcessing(false);
        }
    };

    const handleDevelopSchematic = (schematic: BlueprintSchematic) => {
        const newBlueprint: WreathBlueprint = {
            id: `bp-${Date.now()}`,
            name: schematic.name,
            description: `Developed from the schematic ${schematic.prompt.substring(0, 100)}...`,
            diameterInInches: 24,
            elements: [],
            layoutStyle: 'freeform',
            schematicSvg: schematic.svgContent,
        };
        setActiveBlueprint(newBlueprint);
        setView('studio');
    };

    const addInventoryItem = useCallback(
        async (
            item: Omit<InventoryItem, 'id' | 'imageUrl' | 'processedImageUrl' | 'originalImageUrl' | 'svgUrl'>,
            assets?: {
                processed?: Blob;
                original?: Blob;
                svgText?: string;
            }
        ): Promise<InventoryItem> => {
            const id = `inv-${Date.now()}`;
            const processedRef = ref(storage, `inventory/${id}.png`);
            await uploadBytes(processedRef, assets?.processed!, {
                contentType: (assets?.processed as any)?.type || 'image/png',
            });
            const processedImageUrl = await getDownloadURL(processedRef);

            let originalImageUrl: string | undefined;
            if (assets?.original) {
                const originalExt = (assets.original as any)?.type === 'image/jpeg' ? 'jpg' : 'png';
                const originalRef = ref(storage, `inventory/${id}-original.${originalExt}`);
                await uploadBytes(originalRef, assets.original, {
                    contentType: (assets.original as any)?.type || 'image/jpeg',
                });
                originalImageUrl = await getDownloadURL(originalRef);
            }

            let svgUrl: string | undefined;
            if (assets?.svgText && assets.svgText.length > 0) {
                const svgBlob = new Blob([assets.svgText], { type: 'image/svg+xml' });
                const svgRef = ref(storage, `inventory/${id}.svg`);
                await uploadBytes(svgRef, svgBlob, { contentType: 'image/svg+xml' });
                svgUrl = await getDownloadURL(svgRef);
            }

            let thumbUrl: string | undefined;
            try {
                const storagePath = `inventory/${id}.png`;
                const docPath = `users/local-user-session/inventory/${id}`;
                const resp = await fetch(`${FIREBASE_FUNCTIONS_BASE_URL}/generateThumbnail`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ storagePath, docPath }),
                });
                if (resp.ok) {
                    const data = await resp.json();
                    thumbUrl = data.thumbUrl;
                }
            } catch (e) {

            }

            const newItem: InventoryItem = {
                ...item,
                id,
                imageUrl: processedImageUrl,
                thumbUrl,
                processedImageUrl,
                originalImageUrl,
                svgUrl,
            } as InventoryItem;

            // Check if we need to remove from staging (if this came from "Tag & Edit")
            if (taggerInitialItem) {
                setImportStaging(prev => prev.filter(i => i.id !== taggerInitialItem.id));
                setTaggerInitialItem(null);
            }

            setInventory((prev) => [...prev, newItem]);
            setView('inventory');
            return newItem;
        },
        [taggerInitialItem]
    );

    const handleSendToTagger = (item: InventoryItem) => {
        setTaggerInitialItem(item);
        setView('tagger');
    };

    const removeInventoryItem = useCallback(async (id: string) => {
        setInventory((prev) => prev.filter((i) => i.id !== id));
        try {
            const imageRef = ref(storage, `inventory/${id}.png`);
            await deleteObject(imageRef);
        } catch (e) {

        }
    }, []);

    const toggleInventoryAvailability = useCallback((id: string) => {
        setInventory((p) =>
            p.map((i) =>
                i.id === id ? { ...i, isAvailable: !i.isAvailable } : i
            )
        );
    }, []);

    const updateInventoryItem = useCallback((item: InventoryItem) => {
        setInventory((p) =>
            p.map((i) => (i.id === item.id ? item : i))
        );
    }, []);

    const addInventoryItems = useCallback((items: InventoryItem[]) => {
        setInventory((prev) => [...prev, ...items]);
    }, []);

    const addDesignDrop = useCallback((drop: Omit<DesignDrop, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newDrop: DesignDrop = {
            ...drop,
            id: `drop-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setDesignDrops((prev) => [...prev, newDrop]);
    }, []);

    const updateDesignDrop = useCallback((drop: DesignDrop) => {
        setDesignDrops((prev) => prev.map((d) => (d.id === drop.id ? drop : d)));
    }, []);

    const removeDesignDrop = useCallback((id: string) => {
        setDesignDrops((prev) => prev.filter((d) => d.id !== id));
    }, []);

    const addBlueprint = useCallback(
        (bp: Omit<WreathBlueprint, 'id'>): WreathBlueprint => {
            const newBp: WreathBlueprint = { ...bp, id: `bp-${Date.now()}` };
            setBlueprints((p) => [...p, newBp]);
            return newBp;
        },
        []
    );

    const updateBlueprint = useCallback((bp: WreathBlueprint): WreathBlueprint => {
        setBlueprints((p) => p.map((b) => (b.id === bp.id ? bp : b)));
        setActiveBlueprint(bp);
        return bp;
    }, []);

    const removeBlueprint = useCallback((id: string) => {
        setBlueprints((p) => p.filter((b) => b.id !== id));
    }, []);

    const addSchematic = useCallback(
        (sc: Omit<BlueprintSchematic, 'id'>): BlueprintSchematic => {
            const newSc: BlueprintSchematic = {
                ...sc,
                id: `sch-${Date.now()}`,
            };
            setSchematics((p) => [...p, newSc]);
            return newSc;
        },
        []
    );

    const removeSchematic = useCallback((id: string) => {
        setSchematics((p) => p.filter((s) => s.id !== id));
    }, []);

    const addGrammarItem = useCallback((item: Omit<EmotionalGrammarItem, 'id'>) => {
        setGrammar((p) => [...p, { ...item, id: `emo-${Date.now()}` }]);
    }, []);

    const updateGrammarItem = useCallback((item: EmotionalGrammarItem) => {
        setGrammar((p) => p.map((g) => (g.id === item.id ? item : g)));
    }, []);

    const removeGrammarItem = useCallback((id: string) => {
        setGrammar((p) => p.filter((g) => g.id !== id));
    }, []);

    const renderView = () => {
        if (isGenerating) return <Loader />;

        switch (view) {
            case 'creator':
                return <MemoryInputForm onGenerate={handleGenerateWreath} />;
            case 'display':
                if (!generatedBlueprint || !coordinatorOutput) {
                    return <p>No blueprint to display.</p>;
                }
                return (
                    <WreathDisplay
                        initialBlueprint={generatedBlueprint}
                        inventory={inventory}
                        addBlueprint={(bp) => {
                            const newBp = { ...bp, id: `bp-${Date.now()}` };
                            setBlueprints((p) => [...p, newBp]);
                            return newBp;
                        }}
                        onClose={() => {
                            setView('creator');
                            setCoordinatorOutput(null);
                            setSelectedNameOption(null);
                        }}
                        narrative={coordinatorOutput.narrative}
                        nameOptions={coordinatorOutput.nameOptions}
                        schematic={coordinatorOutput.schematic}
                        manufacturing={coordinatorOutput.manufacturing}
                        selectedName={selectedNameOption}
                        onNameSelect={setSelectedNameOption}
                    />
                );
            case 'tagger':
                return (
                    <EmotionalTagger
                        addInventoryItem={addInventoryItem}
                        grammar={grammar}
                        addGrammarItem={addGrammarItem}
                        initialItem={taggerInitialItem}
                    />
                );
            case 'inventory':
                return (
                    <InventoryDashboard
                        inventory={inventory}
                        removeInventoryItem={removeInventoryItem}
                        toggleAvailability={toggleInventoryAvailability}
                        updateInventoryItem={updateInventoryItem}
                        addInventoryItems={addInventoryItems}
                        onLoadCsvLookup={setMelroseCsvLookup}
                        csvLookupCount={melroseCsvLookup.size}
                        importStaging={importStaging}
                        onApproveStaging={(items) => {
                            // Move items from staging to inventory
                            // Ensure unique IDs to prevent key collision crashes
                            const approvedItems = items.map(i => ({
                                ...i,
                                id: i.id.startsWith('ext-') ? i.id : `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                // Ensure critical fields exist
                                visualWeight: i.visualWeight ?? 0.5,
                                emotionTags: i.emotionTags ?? [],
                                isAvailable: true,
                                // Default dimensions if missing (common extension issue)
                                dimensions: i.dimensions || { widthInches: 24, heightInches: 24 },
                                emotionalDimensions: i.emotionalDimensions || { valence: 0.5, arousal: 0.5, temporalWeight: 0.5 },
                                seasonTags: i.seasonTags || [],
                                logicTrail: i.logicTrail || ['Imported via Extension'],
                                type: i.type || 'accent',
                                inventoryCategory: i.inventoryCategory || 'floral'
                            }));

                            setInventory(prev => {
                                // Check for duplicates
                                const existingIds = new Set(prev.map(p => p.id));
                                const uniqueNew = approvedItems.filter(i => !existingIds.has(i.id));
                                return [...prev, ...uniqueNew];
                            });

                            // Remove approved items from staging
                            const approvedIds = new Set(items.map(i => i.id));
                            setImportStaging(prev => prev.filter(i => !approvedIds.has(i.id)));
                        }}
                        onRemoveFromStaging={(itemId) => {
                            setImportStaging(prev => prev.filter(i => i.id !== itemId));
                        }}
                        onUpdateStagingItem={(updatedItem) => {
                            setImportStaging(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
                        }}
                        onSendToTagger={handleSendToTagger}
                    />
                );
            case 'architect':
                return (
                    <BlueprintArchitect
                        addSchematic={addSchematic}
                        onDevelop={handleDevelopSchematic}
                        grammar={grammar}
                        inventory={inventory}
                        styleProfile={styleProfile}
                        schematics={schematics}
                    />
                );
            case 'library':
                return (
                    <BlueprintLibrary
                        blueprints={blueprints}
                        schematics={schematics}
                        removeBlueprint={removeBlueprint}
                        removeSchematic={removeSchematic}
                        onSelectBlueprint={(id) => {
                            const bp = blueprints.find((b) => b.id === id);
                            if (bp) {
                                setActiveBlueprint(bp);
                                setView('studio');
                            }
                        }}
                        onSelectSchematic={handleDevelopSchematic}
                    />
                );
            case 'studio':
                return (
                    <BlueprintStudio
                        inventory={inventory}
                        blueprints={blueprints}
                        addBlueprint={addBlueprint}
                        updateBlueprint={updateBlueprint}
                        activeBlueprint={activeBlueprint}
                        setActiveBlueprint={setActiveBlueprint}
                        styleProfile={styleProfile}
                        setStyleProfile={setStyleProfile}
                        setSyncStatus={setSyncStatus}
                    />
                );
            case 'grammar':
                return (
                    <EmotionalGrammarEditor
                        grammar={grammar}
                        addGrammarItem={addGrammarItem}
                        updateGrammarItem={updateGrammarItem}
                        removeGrammarItem={removeGrammarItem}
                    />
                );
            case 'profile':
                return (
                    <StyleProfileEditor
                        styleProfile={styleProfile}
                        setStyleProfile={setStyleProfile}
                    />
                );
            case 'dashboard':
                return <AgentDashboard />;
            case 'vision-test':
                return (
                    <React.Suspense fallback={<Loader />}>
                        <VisionAgentTester />
                    </React.Suspense>
                );
            case 'enhanced-demo':
                return (
                    <React.Suspense fallback={<Loader />}>
                        <EnhancedFloralDemo />
                    </React.Suspense>
                );
            case 'dashboard-wiring':
                return <DashboardWiring />;
            case 'drops':
                return (
                    <DesignDrops
                        inventory={inventory}
                        drops={designDrops}
                        addDrop={addDesignDrop}
                        updateDrop={updateDesignDrop}
                        removeDrop={removeDesignDrop}
                    />
                );
            default:
                return <p>Unknown view</p>;
        }
    };

    const NavButton: React.FC<{ targetView: AppView; children: React.ReactNode }> = ({
        targetView,
        children,
    }) => (
        <button
            onClick={() => {
                setView(targetView);
                setActiveBlueprint(null);
            }}
            className={`tab ${view === targetView ? 'tab-active' : ''}`}
            aria-current={view === targetView ? 'page' : undefined}
        >
            {children}
        </button>
    );

    const getSyncStatus = () => {
        switch (syncStatus) {
            case 'synced':
                return { text: 'Synced', dotClass: 'sync-dot' };
            case 'syncing':
                return { text: 'Syncing...', dotClass: 'sync-dot sync-dot-syncing' };
            case 'learning':
                return { text: 'Learning...', dotClass: 'sync-dot sync-dot-syncing' };
            case 'error':
                return { text: 'Sync Error', dotClass: 'sync-dot sync-dot-error' };
        }
    };

    const syncInfo = getSyncStatus();

    const getPageTitle = () => {
        const titles: Record<AppView, string> = {
            creator: 'Create Wreath',
            display: 'Wreath Preview',
            architect: 'Blueprint Architect',
            studio: 'Design Studio',
            library: 'Blueprint Library',
            inventory: 'Inventory',
            tagger: 'Image Tagger',
            grammar: 'Emotional Grammar',
            profile: 'Style Profile',
            dashboard: 'Agent Dashboard',
            'dashboard-wiring': 'System Wiring',
            'vision-test': 'Vision Tester',
            'enhanced-demo': 'Enhanced AI',
            drops: 'Design Drops',
        };
        return titles[view] || 'Wreath Weaver';
    };

    const NavItem: React.FC<{ targetView: AppView; icon: React.ReactNode; children: React.ReactNode }> = ({
        targetView,
        icon,
        children,
    }) => (
        <button
            onClick={() => {
                setView(targetView);
                setActiveBlueprint(null);
            }}
            className={`nav-item ${view === targetView ? 'nav-item-active' : ''}`}
        >
            <span className="nav-icon">{icon}</span>
            {children}
        </button>
    );

    const IconCreate = () => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    );
    const IconBlueprint = () => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
    );
    const IconStudio = () => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
        </svg>
    );
    const IconLibrary = () => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
    );
    const IconInventory = () => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
    );
    const IconCamera = () => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
    );
    const IconGrammar = () => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
    );
    const IconProfile = () => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
    );
    const IconDashboard = () => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
        </svg>
    );
    const IconWiring = () => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
        </svg>
    );
    const IconVision = () => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
    const IconAI = () => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
    );
    const IconDrops = () => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
    );

    if (!isFirebaseConfigured) return <FirebaseConfigNeeded />;
    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">W</div>
                        <span>Wreath Weaver</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <div className="nav-section-title">Create</div>
                        <NavItem targetView="creator" icon={<IconCreate />}>New Wreath</NavItem>
                        <NavItem targetView="architect" icon={<IconBlueprint />}>Architect</NavItem>
                        <NavItem targetView="studio" icon={<IconStudio />}>Studio</NavItem>
                    </div>

                    <div className="nav-section">
                        <div className="nav-section-title">Assets</div>
                        <NavItem targetView="library" icon={<IconLibrary />}>Blueprints</NavItem>
                        <NavItem targetView="inventory" icon={<IconInventory />}>Inventory</NavItem>
                        <NavItem targetView="tagger" icon={<IconCamera />}>Image Tagger</NavItem>
                        <NavItem targetView="drops" icon={<IconDrops />}>Design Drops</NavItem>
                    </div>

                    <div className="nav-section">
                        <div className="nav-section-title">Settings</div>
                        <NavItem targetView="grammar" icon={<IconGrammar />}>Emotions</NavItem>
                        <NavItem targetView="profile" icon={<IconProfile />}>Profile</NavItem>
                    </div>

                    <div className="nav-section">
                        <div className="nav-section-title">Developer</div>
                        <NavItem targetView="dashboard" icon={<IconDashboard />}>Dashboard</NavItem>
                        <NavItem targetView="dashboard-wiring" icon={<IconWiring />}>Wiring</NavItem>
                        <NavItem targetView="vision-test" icon={<IconVision />}>Vision Test</NavItem>
                        <NavItem targetView="enhanced-demo" icon={<IconAI />}>Enhanced AI</NavItem>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className="sync-status">
                        <span className={syncInfo.dotClass}></span>
                        {syncInfo.text}
                    </div>
                </div>
            </aside>

            <div className="main-content">
                <header className="main-header">
                    <h1 className="page-title">{getPageTitle()}</h1>
                </header>
                <main className="main-body">
                    {renderView()}
                </main>
            </div>
        </div>
    );
};

export default App;
