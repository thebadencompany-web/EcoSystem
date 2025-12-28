// lib/emotionEngine/emotionTypes.ts
// 7-Dimension Emotion Tagging Schema for Design Drops

// ============================================================================
// DIMENSION 1: PRIMARY EMOTION
// ============================================================================

export type PrimaryEmotion =
  | 'joy'        // bright, celebratory, energetic
  | 'serenity'   // calm, peaceful, meditative
  | 'nostalgia'  // memory, warmth, comfort
  | 'romance'    // intimate, soft, dreamy
  | 'confidence' // bold, powerful, sophisticated
  | 'playfulness'// whimsical, fun, lighthearted
  | 'mystery'    // moody, dramatic, intriguing
  | 'comfort';   // cozy, safe, familiar

export const PRIMARY_EMOTIONS: PrimaryEmotion[] = [
  'joy', 'serenity', 'nostalgia', 'romance',
  'confidence', 'playfulness', 'mystery', 'comfort'
];

// ============================================================================
// DIMENSION 2: AESTHETIC STYLE
// ============================================================================

export type AestheticStyle =
  | 'modern-minimal'
  | 'rustic-farmhouse'
  | 'industrial-loft'
  | 'bohemian-eclectic'
  | 'coastal-cottage'
  | 'mid-century-modern'
  | 'french-country'
  | 'art-deco-glam'
  | 'scandinavian-hygge'
  | 'mediterranean-villa'
  | 'japanese-zen'
  | 'english-garden';

export const AESTHETIC_STYLES: AestheticStyle[] = [
  'modern-minimal', 'rustic-farmhouse', 'industrial-loft', 'bohemian-eclectic',
  'coastal-cottage', 'mid-century-modern', 'french-country', 'art-deco-glam',
  'scandinavian-hygge', 'mediterranean-villa', 'japanese-zen', 'english-garden'
];

export const AESTHETIC_STYLE_LABELS: Record<AestheticStyle, string> = {
  'modern-minimal': 'Modern Minimal',
  'rustic-farmhouse': 'Rustic Farmhouse',
  'industrial-loft': 'Industrial Loft',
  'bohemian-eclectic': 'Bohemian Eclectic',
  'coastal-cottage': 'Coastal Cottage',
  'mid-century-modern': 'Mid-Century Modern',
  'french-country': 'French Country',
  'art-deco-glam': 'Art Deco Glam',
  'scandinavian-hygge': 'Scandinavian Hygge',
  'mediterranean-villa': 'Mediterranean Villa',
  'japanese-zen': 'Japanese Zen',
  'english-garden': 'English Garden',
};

// ============================================================================
// DIMENSION 3: COLOR EMOTION
// ============================================================================

export type ColorEmotionPalette =
  | 'warm'     // terracotta, gold, coral, amber (joy, energy)
  | 'cool'     // sage, navy, slate, periwinkle (serenity, calm)
  | 'neutral'  // ivory, charcoal, taupe, linen (sophistication)
  | 'earthy'   // moss, clay, sand, stone (grounding)
  | 'jewel';   // emerald, sapphire, ruby, amethyst (luxury)

export const COLOR_EMOTION_PALETTES: ColorEmotionPalette[] = [
  'warm', 'cool', 'neutral', 'earthy', 'jewel'
];

// Color to palette mappings
export const COLOR_TO_PALETTE: Record<string, ColorEmotionPalette> = {
  // Warm palette
  'terracotta': 'warm', 'gold': 'warm', 'coral': 'warm', 'amber': 'warm',
  'orange': 'warm', 'red': 'warm', 'rust': 'warm', 'copper': 'warm',
  'yellow': 'warm', 'peach': 'warm', 'apricot': 'warm',
  
  // Cool palette  
  'sage': 'cool', 'navy': 'cool', 'slate': 'cool', 'periwinkle': 'cool',
  'blue': 'cool', 'teal': 'cool', 'aqua': 'cool', 'mint': 'cool',
  'lavender': 'cool', 'sky': 'cool',
  
  // Neutral palette
  'ivory': 'neutral', 'charcoal': 'neutral', 'taupe': 'neutral', 'linen': 'neutral',
  'white': 'neutral', 'cream': 'neutral', 'beige': 'neutral', 'grey': 'neutral',
  'gray': 'neutral', 'black': 'neutral', 'bone': 'neutral', 'sand': 'neutral',
  
  // Earthy palette
  'moss': 'earthy', 'clay': 'earthy', 'stone': 'earthy', 'brown': 'earthy',
  'tan': 'earthy', 'olive': 'earthy', 'forest': 'earthy', 'mushroom': 'earthy',
  'walnut': 'earthy', 'oak': 'earthy', 'natural': 'earthy',
  
  // Jewel palette
  'emerald': 'jewel', 'sapphire': 'jewel', 'ruby': 'jewel', 'amethyst': 'jewel',
  'burgundy': 'jewel', 'plum': 'jewel', 'wine': 'jewel', 'deep blue': 'jewel',
  'forest green': 'jewel', 'royal': 'jewel', 'purple': 'jewel',
};

// ============================================================================
// DIMENSION 4: TEXTURE PROFILE
// ============================================================================

export type TextureProfile =
  | 'soft-plush'      // velvet, chenille, faux fur (comfort, luxury)
  | 'natural-organic' // linen, jute, wood (authenticity, calm)
  | 'smooth-sleek'    // glass, metal, lacquer (modern, clean)
  | 'rough-textured'  // rattan, concrete, weathered wood (rustic, character)
  | 'delicate-refined'; // silk, porcelain, crystal (elegance, romance)

export const TEXTURE_PROFILES: TextureProfile[] = [
  'soft-plush', 'natural-organic', 'smooth-sleek', 'rough-textured', 'delicate-refined'
];

// Material to texture mappings
export const MATERIAL_TO_TEXTURE: Record<string, TextureProfile> = {
  // Soft/Plush
  'velvet': 'soft-plush', 'chenille': 'soft-plush', 'faux fur': 'soft-plush',
  'fleece': 'soft-plush', 'plush': 'soft-plush', 'fabric': 'soft-plush',
  'polyester': 'soft-plush', 'cotton': 'soft-plush',
  
  // Natural/Organic
  'linen': 'natural-organic', 'jute': 'natural-organic', 'wood': 'natural-organic',
  'bamboo': 'natural-organic', 'rattan': 'natural-organic', 'wicker': 'natural-organic',
  'hemp': 'natural-organic', 'seagrass': 'natural-organic', 'twig': 'natural-organic',
  'cork': 'natural-organic', 'sisal': 'natural-organic',
  
  // Smooth/Sleek
  'glass': 'smooth-sleek', 'metal': 'smooth-sleek', 'lacquer': 'smooth-sleek',
  'acrylic': 'smooth-sleek', 'resin': 'smooth-sleek', 'plastic': 'smooth-sleek',
  'chrome': 'smooth-sleek', 'stainless': 'smooth-sleek', 'polished': 'smooth-sleek',
  
  // Rough/Textured
  'concrete': 'rough-textured', 'weathered': 'rough-textured', 'distressed': 'rough-textured',
  'terracotta': 'rough-textured', 'stone': 'rough-textured', 'brick': 'rough-textured',
  'burlap': 'rough-textured', 'dolomite': 'rough-textured',
  
  // Delicate/Refined
  'silk': 'delicate-refined', 'porcelain': 'delicate-refined', 'crystal': 'delicate-refined',
  'ceramic': 'delicate-refined', 'bone china': 'delicate-refined', 'satin': 'delicate-refined',
  'lace': 'delicate-refined', 'wax': 'delicate-refined',
};

// ============================================================================
// DIMENSION 5: FUNCTIONAL MOOD
// ============================================================================

export type FunctionalMood =
  | 'gathering'     // dining tables, conversation seating (social, joyful)
  | 'retreat'       // reading chairs, bedroom (personal, serene)
  | 'showcase'      // statement pieces, art (confidence, pride)
  | 'ambient'       // lighting, candles (mood-setting, romantic)
  | 'organization'; // storage with beauty (control, calm)

export const FUNCTIONAL_MOODS: FunctionalMood[] = [
  'gathering', 'retreat', 'showcase', 'ambient', 'organization'
];

// Category to functional mood mappings
export const CATEGORY_TO_FUNCTIONAL_MOOD: Record<string, FunctionalMood> = {
  'Lanterns': 'ambient',
  'LED Candles': 'ambient',
  'Candle Holders': 'ambient',
  'Wall Decor': 'showcase',
  'Clocks': 'showcase',
  'Garden Decor': 'retreat',
  'Faux Plants & Arrangements': 'retreat',
  'Faux Wreath & Garland': 'showcase',
  'Christmas Wreath & Garland': 'showcase',
  'Decorative Bowls, Vases & Trays': 'showcase',
  'Pots & Planters': 'retreat',
  'Novelty Decor': 'showcase',
  'Halloween Decor': 'showcase',
  'Easter': 'gathering',
  'Americana': 'gathering',
  'Fall & Thanksgiving': 'gathering',
  'Christmas Tabletop Trees': 'ambient',
  'Christmas Novelty Decor': 'ambient',
  'EkkoLights': 'ambient',
  'Ribbon': 'organization',
  'Faux Stems & Sprays': 'showcase',
};

// ============================================================================
// DIMENSION 6: TIME OF DAY ENERGY
// ============================================================================

export type TimeOfDayEnergy =
  | 'morning'   // bright, fresh, energizing (white, yellow, crisp)
  | 'afternoon' // warm, productive, grounded (natural light, earth tones)
  | 'evening'   // intimate, relaxing, cozy (amber, soft, layered)
  | 'night';    // dramatic, mysterious, luxe (dark, moody, metallic)

export const TIME_OF_DAY_ENERGIES: TimeOfDayEnergy[] = [
  'morning', 'afternoon', 'evening', 'night'
];

// ============================================================================
// DIMENSION 7: MEMORY TRIGGERS
// ============================================================================

export const MEMORY_TRIGGER_TEMPLATES = [
  'Sunday morning coffee with newspapers',
  'Grandmother\'s living room at Christmas',
  'Beach house vacation',
  'First apartment independence',
  'Romantic Paris café',
  'Mountain cabin escape',
  'Garden party in May',
  'Cozy rainy afternoon',
  'Summer porch evenings',
  'Holiday dinner table',
  'Candlelit dinner date',
  'Lazy weekend morning',
  'Sunset terrace drinks',
  'Quiet reading nook',
  'Fresh flowers on the table',
];

// ============================================================================
// COMBINED TYPES
// ============================================================================

export interface EmotionScores {
  joy: number;
  serenity: number;
  nostalgia: number;
  romance: number;
  confidence: number;
  playfulness: number;
  mystery: number;
  comfort: number;
}

export interface StyleScores {
  'modern-minimal': number;
  'rustic-farmhouse': number;
  'industrial-loft': number;
  'bohemian-eclectic': number;
  'coastal-cottage': number;
  'mid-century-modern': number;
  'french-country': number;
  'art-deco-glam': number;
  'scandinavian-hygge': number;
  'mediterranean-villa': number;
  'japanese-zen': number;
  'english-garden': number;
}

export interface ProductEmotionTags {
  // Primary emotion (highest scoring)
  primaryEmotion: PrimaryEmotion;
  // Secondary emotions (2nd and 3rd highest)
  secondaryEmotions: PrimaryEmotion[];
  // Full scores 0-100 for each emotion
  emotionScores: EmotionScores;
  
  // Aesthetic styling
  aestheticStyle: AestheticStyle;
  compatibleStyles: AestheticStyle[];
  styleScores: Partial<StyleScores>;
  
  // Sensory dimensions
  colorEmotion: ColorEmotionPalette;
  textureProfiles: TextureProfile[];
  
  // Functional context
  functionalMood: FunctionalMood;
  timeOfDayEnergy: TimeOfDayEnergy[];
  
  // Evocative memories
  memoryTriggers: string[];
  
  // Confidence in tagging
  confidence: number;
  
  // Simple string tags for backwards compatibility
  simpleTags: string[];
}

// ============================================================================
// DROP THEME TYPES
// ============================================================================

export interface DropTheme {
  id: string;
  name: string;
  primaryEmotion: PrimaryEmotion;
  secondaryEmotions: PrimaryEmotion[];
  aestheticStyle: AestheticStyle;
  colorPalette: string[];
  story: string;
  memoryTrigger: string;
  targetPieces: number;
  useCase: string; // e.g., "Living room or bedroom retreat"
  timeOfDay: TimeOfDayEnergy;
}

// Pre-defined drop themes from the framework
export const PRESET_DROP_THEMES: Omit<DropTheme, 'id'>[] = [
  {
    name: 'Quiet Sunday Morning',
    primaryEmotion: 'serenity',
    secondaryEmotions: ['comfort', 'nostalgia'],
    aestheticStyle: 'scandinavian-hygge',
    colorPalette: ['cream', 'soft gray', 'warm white', 'natural wood'],
    story: 'Remember that feeling? The world is still sleeping, but you\'re awake with your coffee, wrapped in a soft blanket, golden light streaming through the windows. No agenda. No rush. Just quiet presence.',
    memoryTrigger: 'Slow weekend mornings with coffee and a book',
    targetPieces: 12,
    useCase: 'Living room or bedroom retreat',
    timeOfDay: 'morning',
  },
  {
    name: 'Cozy Cabin Retreat',
    primaryEmotion: 'nostalgia',
    secondaryEmotions: ['comfort', 'serenity'],
    aestheticStyle: 'rustic-farmhouse',
    colorPalette: ['warm brown', 'forest green', 'cream', 'copper'],
    story: 'The fire crackles, snow falls softly outside, and you\'re wrapped in the warmth of weathered wood and soft textures. Every piece tells a story of simpler times.',
    memoryTrigger: 'Mountain cabin escape',
    targetPieces: 12,
    useCase: 'Living room gathering space',
    timeOfDay: 'evening',
  },
  {
    name: 'Moody Evenings',
    primaryEmotion: 'mystery',
    secondaryEmotions: ['confidence', 'romance'],
    aestheticStyle: 'industrial-loft',
    colorPalette: ['charcoal', 'burgundy', 'gold', 'matte black'],
    story: 'The city glitters beyond your window as candlelight dances on dark walls. This is your sanctuary of sophistication, where every shadow holds intention.',
    memoryTrigger: 'Candlelit dinner date',
    targetPieces: 12,
    useCase: 'Home office or dining room',
    timeOfDay: 'night',
  },
  {
    name: 'Mediterranean Terrace',
    primaryEmotion: 'joy',
    secondaryEmotions: ['romance', 'serenity'],
    aestheticStyle: 'mediterranean-villa',
    colorPalette: ['terracotta', 'olive', 'cream', 'ocean blue'],
    story: 'Sun-warmed stone, the scent of herbs, and the distant sound of waves. Every piece captures the effortless elegance of coastal living.',
    memoryTrigger: 'Sunset terrace drinks',
    targetPieces: 12,
    useCase: 'Outdoor patio or sunroom',
    timeOfDay: 'afternoon',
  },
];
