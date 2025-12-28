// hooks/useAgentOutput.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  botanicalAnalysisAgent, 
  logicEngineAgent, 
  florosAgent, 
  fallbackAgent,
  clearStemAgent 
} from '../services/aiAgents';

export type AgentType = 'clearStem' | 'botanicalAnalysis' | 'logicEngine' | 'floros' | 'fallback';

export interface AgentOutput {
  agentId: string;
  agentType: AgentType;
  timestamp: Date;
  input: any;
  output: any;
  error?: string;
  isLoading: boolean;
  emotionalImpactScore?: number;
  annotations?: string[];
}

export interface EmotionalImpactMetrics {
  memoryType: { value: string; weight: number };
  botanicalSymbolism: { value: string; weight: number };
  gestureLogic: { value: string; weight: number };
  toneAccuracy: { value: number; weight: number };
  manufacturabilityConfidence: { value: number; weight: number };
  totalScore: number;
}

// Hook for managing individual agent outputs
export const useAgentOutput = (agentId: string) => {
  const [output, setOutput] = useState<AgentOutput | null>(null);

  const executeAgent = useCallback(async (agentType: AgentType, input: any) => {
    setOutput(prev => prev ? { ...prev, isLoading: true, error: undefined } : {
      agentId,
      agentType,
      timestamp: new Date(),
      input,
      output: null,
      isLoading: true
    });

    try {
      let result: any;
      
      switch (agentType) {
        case 'clearStem':
          result = await clearStemAgent(input);
          break;
        case 'botanicalAnalysis':
          result = await botanicalAnalysisAgent(input);
          break;
        case 'logicEngine':
          result = await logicEngineAgent(input);
          break;
        case 'floros':
          result = await florosAgent(input);
          break;
        case 'fallback':
          result = await fallbackAgent(input);
          break;
        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }

      // Calculate emotional impact score
      const emotionalImpactScore = calculateEmotionalImpact(agentType, result);
      const annotations = generateAnnotations(agentType, result);

      setOutput({
        agentId,
        agentType,
        timestamp: new Date(),
        input,
        output: result,
        isLoading: false,
        emotionalImpactScore,
        annotations
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setOutput(prev => prev ? {
        ...prev,
        error: errorMessage,
        isLoading: false
      } : {
        agentId,
        agentType,
        timestamp: new Date(),
        input,
        output: null,
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  }, [agentId]);

  return { output, executeAgent };
};

// Hook for managing multiple agent outputs with routing
export const useAgentPipeline = () => {
  const [outputs, setOutputs] = useState<{ [agentId: string]: AgentOutput }>({});
  
  const getAgentOutput = useCallback((agentId: string) => {
    return outputs[agentId] || null;
  }, [outputs]);

  const executeAgentStep = useCallback(async (agentId: string, agentType: AgentType, input: any) => {
    // Set loading state
    setOutputs(prev => ({
      ...prev,
      [agentId]: {
        agentId,
        agentType,
        timestamp: new Date(),
        input,
        output: null,
        isLoading: true
      }
    }));

    try {
      let result: any;
      
      switch (agentType) {
        case 'clearStem':
          result = await clearStemAgent(input);
          break;
        case 'botanicalAnalysis':
          result = await botanicalAnalysisAgent(input);
          break;
        case 'logicEngine':
          result = await logicEngineAgent(input);
          break;
        case 'floros':
          result = await florosAgent(input);
          break;
        case 'fallback':
          result = await fallbackAgent(input);
          break;
        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }

      const emotionalImpactScore = calculateEmotionalImpact(agentType, result);
      const annotations = generateAnnotations(agentType, result);

      setOutputs(prev => ({
        ...prev,
        [agentId]: {
          agentId,
          agentType,
          timestamp: new Date(),
          input,
          output: result,
          isLoading: false,
          emotionalImpactScore,
          annotations
        }
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setOutputs(prev => ({
        ...prev,
        [agentId]: {
          ...prev[agentId],
          error: errorMessage,
          isLoading: false
        }
      }));
      throw error;
    }
  }, []);

  const clearOutputs = useCallback(() => {
    setOutputs({});
  }, []);

  const removeOutput = useCallback((agentId: string) => {
    setOutputs(prev => {
      const newOutputs = { ...prev };
      delete newOutputs[agentId];
      return newOutputs;
    });
  }, []);

  return {
    outputs,
    getAgentOutput,
    executeAgentStep,
    clearOutputs,
    removeOutput
  };
};

// Emotional Impact Scoring Implementation
function calculateEmotionalImpact(agentType: AgentType, result: any): number {
  const metrics: EmotionalImpactMetrics = {
    memoryType: extractMemoryType(result),
    botanicalSymbolism: extractBotanicalSymbolism(result),
    gestureLogic: extractGestureLogic(result),
    toneAccuracy: extractToneAccuracy(result),
    manufacturabilityConfidence: extractManufacturabilityConfidence(result),
    totalScore: 0
  };

  // Calculate weighted sum
  metrics.totalScore = 
    (metrics.memoryType.weight * getScoreValue(metrics.memoryType.value)) +
    (metrics.botanicalSymbolism.weight * getScoreValue(metrics.botanicalSymbolism.value)) +
    (metrics.gestureLogic.weight * getScoreValue(metrics.gestureLogic.value)) +
    (metrics.toneAccuracy.weight * metrics.toneAccuracy.value) +
    (metrics.manufacturabilityConfidence.weight * metrics.manufacturabilityConfidence.value);

  return Math.min(1.0, Math.max(0.0, metrics.totalScore));
}

function extractMemoryType(result: any): { value: string; weight: number } {
  // Extract memory type from logicEngine output (0.3 weight)
  const memoryTypes = ['tribute', 'seasonal echo', 'celebration', 'healing', 'remembrance'];
  const detectedType = result?.memoryType || result?.emotionalAnalysis?.memoryType || 'general';
  
  return {
    value: memoryTypes.includes(detectedType) ? detectedType : 'general',
    weight: 0.3
  };
}

function extractBotanicalSymbolism(result: any): { value: string; weight: number } {
  // Extract botanical symbolism from botanicalAnalysis (0.2 weight)
  const symbolism = result?.botanicalMetadata?.symbolism || 
                   result?.visualFeatures?.symbolism || 
                   result?.culturalContext || 'none';
  
  return {
    value: symbolism,
    weight: 0.2
  };
}

function extractGestureLogic(result: any): { value: string; weight: number } {
  // Extract gesture logic from botanicalAnalysis or logicEngine (0.2 weight)
  const gestureLogic = result?.gestureLanguage || 
                      result?.spatialArrangement || 
                      result?.layoutInstructions?.gestureFlow || 'neutral';
  
  return {
    value: gestureLogic,
    weight: 0.2
  };
}

function extractToneAccuracy(result: any): { value: number; weight: number } {
  // Extract tone accuracy from logicEngine (0.2 weight)
  const confidence = result?.emotionalAnalysis?.confidence || 
                    result?.toneMatch || 
                    result?.accuracy || 0.5;
  
  return {
    value: typeof confidence === 'number' ? confidence : 0.5,
    weight: 0.2
  };
}

function extractManufacturabilityConfidence(result: any): { value: number; weight: number } {
  // Extract manufacturability from floros agent (0.1 weight)
  const confidence = result?.manufacturingConfidence || 
                    result?.feasibilityScore || 
                    result?.blueprintConfidence || 0.7;
  
  return {
    value: typeof confidence === 'number' ? confidence : 0.7,
    weight: 0.1
  };
}

function getScoreValue(value: string): number {
  // Convert categorical values to numeric scores
  const scoreMap: { [key: string]: number } = {
    // Memory types
    'tribute': 0.9,
    'seasonal echo': 0.8,
    'celebration': 0.85,
    'healing': 0.9,
    'remembrance': 0.95,
    'general': 0.5,
    
    // Botanical symbolism quality
    'rich': 0.9,
    'moderate': 0.7,
    'light': 0.5,
    'none': 0.2,
    
    // Gesture logic strength
    'upward': 0.9, // resilience
    'embracing': 0.85, // comfort
    'radiating': 0.8, // joy
    'cascading': 0.75, // grace
    'neutral': 0.5
  };
  
  return scoreMap[value.toLowerCase()] || 0.5;
}

function generateAnnotations(agentType: AgentType, result: any): string[] {
  const annotations: string[] = [];
  
  switch (agentType) {
    case 'clearStem':
      annotations.push('Background removed for clean botanical analysis');
      if (result?.confidence) {
        annotations.push(`Removal confidence: ${Math.round(result.confidence * 100)}%`);
      }
      break;
      
    case 'botanicalAnalysis':
      if (result?.species) {
        annotations.push(`Species identified: ${result.species}`);
      }
      if (result?.culturalContext) {
        annotations.push(`Cultural symbolism: ${result.culturalContext}`);
      }
      if (result?.emotionalDimensions) {
        annotations.push(`Emotional dimensions mapped`);
      }
      break;
      
    case 'logicEngine':
      const memoryType = extractMemoryType(result);
      annotations.push(`Memory type: ${memoryType.value}`);
      
      if (result?.emotionalAnalysis?.primaryEmotion) {
        annotations.push(`Primary emotion: ${result.emotionalAnalysis.primaryEmotion}`);
      }
      
      if (result?.emotionalAnalysis?.intensity) {
        annotations.push(`Emotional intensity: ${Math.round(result.emotionalAnalysis.intensity * 100)}%`);
      }
      break;
      
    case 'floros':
      annotations.push('Manufacturing blueprint generated');
      
      if (result?.materialsList?.flowers?.length) {
        annotations.push(`${result.materialsList.flowers.length} flower types required`);
      }
      
      if (result?.assemblySteps?.length) {
        annotations.push(`${result.assemblySteps.length} assembly steps`);
      }
      
      const manufacturability = extractManufacturabilityConfidence(result);
      annotations.push(`Manufacturing confidence: ${Math.round(manufacturability.value * 100)}%`);
      break;
      
    case 'fallback':
      annotations.push('Fallback processing applied');
      if (result?.recoveredFields?.length) {
        annotations.push(`${result.recoveredFields.length} fields recovered`);
      }
      if (result?.missingData?.length) {
        annotations.push(`${result.missingData.length} fields still missing`);
      }
      break;
  }
  
  return annotations;
}