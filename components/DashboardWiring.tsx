// components/DashboardWiring.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAgentPipeline, AgentType } from '../hooks/useAgentOutput';
import { ClearStemPreview } from './ClearStemPreview';
import { BotanicalMetadata } from './BotanicalMetadata';
import { EmotionalGrammar } from './EmotionalGrammar';
import { FlorosBlueprint } from './FlorosBlueprint';
import { FallbackNotice } from './FallbackNotice';

interface DashboardWiringProps {
  initialInput?: any;
  onProcessingComplete?: (results: any) => void;
}

const STEP_MESSAGES: Record<AgentType, string> = {
  clearStem: 'Removing background from image...',
  botanicalAnalysis: 'Analyzing botanical features and characteristics...',
  logicEngine: 'Processing emotional grammar and gesture logic...',
  floros: 'Generating wreath blueprint and layout...',
  fallback: 'Attempting recovery with fallback processing...'
};

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`[Pipeline] Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export const DashboardWiring: React.FC<DashboardWiringProps> = ({
  initialInput,
  onProcessingComplete
}) => {
  const { outputs, executeAgentStep, clearOutputs } = useAgentPipeline();
  
  // UI State
  const [currentStep, setCurrentStep] = useState<AgentType | null>(null);
  const [stepMessage, setStepMessage] = useState<string>('');
  const [processingInput, setProcessingInput] = useState<any>(null);
  const [emotionTone, setEmotionTone] = useState<string>('neutral');
  const [season, setSeason] = useState<string>('spring');
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [isAutoProcessing, setIsAutoProcessing] = useState<boolean>(false);

  const updateStep = (step: AgentType) => {
    setCurrentStep(step);
    setStepMessage(STEP_MESSAGES[step] || 'Processing...');
  };

  // Agent execution pipeline with retry logic
  const executePipeline = useCallback(async (input: any) => {
    setProcessingInput(input);
    setIsAutoProcessing(true);
    setOverallProgress(0);

    try {
      // Step 1: Clear Stem (if image provided)
      let clearedImage = null;
      if (input.image) {
        updateStep('clearStem');
        setOverallProgress(20);
        clearedImage = await withRetry(
          () => executeAgentStep('clearStem-1', 'clearStem', input.image),
          3, 1000
        );
      }

      // Step 2: Botanical Analysis
      updateStep('botanicalAnalysis');
      setOverallProgress(40);
      const botanicalData = await withRetry(
        () => executeAgentStep('botanical-1', 'botanicalAnalysis', clearedImage || input.image || input),
        3, 1000
      );

      // Step 3: Logic Engine (Emotional Grammar)
      updateStep('logicEngine');
      setOverallProgress(60);
      const emotionalGrammar = await withRetry(
        () => executeAgentStep('logic-1', 'logicEngine', {
          ...input,
          botanicalMetadata: botanicalData,
          visualFeatures: botanicalData?.visualFeatures
        }),
        3, 1000
      );

      // Update UI emotional context
      if (emotionalGrammar?.emotionalAnalysis?.primaryEmotion) {
        setEmotionTone(emotionalGrammar.emotionalAnalysis.primaryEmotion);
      }
      if (botanicalData?.seasonalContext || botanicalData?.bloomingSeason) {
        setSeason(botanicalData.seasonalContext || botanicalData.bloomingSeason);
      }

      // Step 4: Floros Agent (Manufacturing Blueprint)
      updateStep('floros');
      setOverallProgress(80);
      const blueprint = await withRetry(
        () => executeAgentStep('floros-1', 'floros', {
          memory: input.memory || input.description,
          botanicalMetadata: botanicalData,
          emotionalGrammar: emotionalGrammar,
          inventory: input.inventory || [],
          styleProfile: input.styleProfile
        }),
        3, 1000
      );

      setOverallProgress(100);
      setCurrentStep(null);
      setStepMessage('Complete!');

      // Callback with results
      if (onProcessingComplete) {
        onProcessingComplete({
          clearStem: clearedImage,
          botanical: botanicalData,
          emotional: emotionalGrammar,
          blueprint: blueprint,
          emotionTone,
          season
        });
      }

    } catch (error) {
      console.error('Pipeline execution failed after retries:', error);
      
      // Try fallback recovery
      updateStep('fallback');
      try {
        await executeAgentStep('fallback-1', 'fallback', {
          originalInput: input,
          error: error,
          partialResults: outputs
        });
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setIsAutoProcessing(false);
      setCurrentStep(null);
    }
  }, [executeAgentStep, outputs, onProcessingComplete, emotionTone, season]);

  // Manual agent execution
  const executeStep = useCallback(async (agentType: AgentType, input: any) => {
    const agentId = `${agentType}-${Date.now()}`;
    setCurrentStep(agentType);
    
    try {
      await executeAgentStep(agentId, agentType, input);
    } catch (error) {
      console.error(`Manual ${agentType} execution failed:`, error);
    } finally {
      setCurrentStep(null);
    }
  }, [executeAgentStep]);

  // Auto-process when initial input is provided
  useEffect(() => {
    if (initialInput && Object.keys(outputs).length === 0) {
      executePipeline(initialInput);
    }
  }, [initialInput, executePipeline, outputs]);

  // Calculate progress based on completed outputs
  useEffect(() => {
    if (!isAutoProcessing) {
      const totalSteps = 4; // clearStem, botanical, logic, floros
      const completedSteps = Object.keys(outputs).filter(key => 
        !outputs[key].isLoading && !outputs[key].error
      ).length;
      setOverallProgress((completedSteps / totalSteps) * 100);
    }
  }, [outputs, isAutoProcessing]);

  // Get outputs for each agent type
  const clearStemOutput = Object.values(outputs).find(o => o.agentType === 'clearStem');
  const botanicalOutput = Object.values(outputs).find(o => o.agentType === 'botanicalAnalysis');
  const logicOutput = Object.values(outputs).find(o => o.agentType === 'logicEngine');
  const florosOutput = Object.values(outputs).find(o => o.agentType === 'floros');
  const fallbackOutput = Object.values(outputs).find(o => o.agentType === 'fallback');

  // Get overall emotional impact score
  const overallEmotionalImpact = useMemo(() => {
    const scores = Object.values(outputs)
      .map(output => output.emotionalImpactScore || 0)
      .filter(score => score > 0);
    
    return scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 0;
  }, [outputs]);

  return (
    <div className="dashboard-wiring">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h2>Fauxever Memories Agent Dashboard</h2>
        <div className="dashboard-controls">
          <div className="emotion-season-display">
            <div className="emotion-display">
              <label>Emotion:</label>
              <span className={`emotion-badge ${emotionTone}`}>{emotionTone}</span>
            </div>
            <div className="season-display">
              <label>Season:</label>
              <span className={`season-badge ${season}`}>{season}</span>
            </div>
          </div>
          
          <div className="overall-impact">
            <label>Emotional Impact:</label>
            <div className="impact-bar">
              <div 
                className="impact-fill"
                style={{ 
                  width: `${overallEmotionalImpact * 100}%`,
                  backgroundColor: getOverallImpactColor(overallEmotionalImpact)
                }}
              />
              <span>{Math.round(overallEmotionalImpact * 100)}%</span>
            </div>
          </div>

          <button 
            className="clear-outputs-btn"
            onClick={clearOutputs}
            disabled={isAutoProcessing}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Progress Indicator */}
      {(isAutoProcessing || overallProgress > 0) && (
        <div className="progress-section">
          <div className="progress-header">
            <h3>Processing Pipeline</h3>
            {currentStep && (
              <div className="current-step">
                <span className="step-name-label">{formatStepName(currentStep)}</span>
                {stepMessage && <span className="step-message">{stepMessage}</span>}
              </div>
            )}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${overallProgress}%` }}
            />
            <span className="progress-text">{Math.round(overallProgress)}%</span>
          </div>
          <div className="pipeline-steps">
            {(['clearStem', 'botanicalAnalysis', 'logicEngine', 'floros'] as AgentType[]).map((step, index) => (
              <div 
                key={step} 
                className={`pipeline-step ${
                  currentStep === step ? 'active' : 
                  Object.values(outputs).some(o => o.agentType === step && !o.error) ? 'completed' : 
                  Object.values(outputs).some(o => o.agentType === step && o.error) ? 'error' : 
                  'pending'
                }`}
              >
                <div className="step-number">{index + 1}</div>
                <div className="step-name">{formatStepName(step)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Controls */}
      {!isAutoProcessing && (
        <div className="manual-controls">
          <h3>Manual Agent Execution</h3>
          <div className="agent-buttons">
            <button 
              onClick={() => executeStep('clearStem', processingInput?.image)}
              disabled={!processingInput?.image}
              className="agent-btn clearStem"
            >
              Clear Background
            </button>
            <button 
              onClick={() => executeStep('botanicalAnalysis', processingInput)}
              className="agent-btn botanical"
            >
              Analyze Botanical
            </button>
            <button 
              onClick={() => executeStep('logicEngine', processingInput)}
              className="agent-btn logic"
            >
              Process Emotions
            </button>
            <button 
              onClick={() => executeStep('floros', processingInput)}
              className="agent-btn floros"
            >
              Generate Blueprint
            </button>
          </div>
        </div>
      )}

      {/* Agent Output Modules */}
      <div className="agent-outputs">
        {/* Clear Stem Preview */}
        {clearStemOutput && (
          <ClearStemPreview 
            output={clearStemOutput}
            emotionTone={emotionTone}
            season={season}
          />
        )}

        {/* Botanical Metadata */}
        {botanicalOutput && (
          <BotanicalMetadata 
            output={botanicalOutput}
            emotionTone={emotionTone}
            season={season}
          />
        )}

        {/* Emotional Grammar */}
        {logicOutput && (
          <EmotionalGrammar 
            output={logicOutput}
            emotionTone={emotionTone}
            season={season}
          />
        )}

        {/* Floros Blueprint */}
        {florosOutput && (
          <FlorosBlueprint 
            output={florosOutput}
            emotionTone={emotionTone}
            season={season}
          />
        )}

        {/* Fallback Notice */}
        {fallbackOutput && (
          <FallbackNotice 
            output={fallbackOutput}
            emotionTone={emotionTone}
            season={season}
          />
        )}
      </div>

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-section">
          <details>
            <summary>Debug: Agent Outputs</summary>
            <pre>{JSON.stringify(outputs, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

// Helper functions
function formatStepName(step: AgentType): string {
  const stepNames: { [key in AgentType]: string } = {
    clearStem: 'Background Removal',
    botanicalAnalysis: 'Botanical Analysis',
    logicEngine: 'Emotional Grammar',
    floros: 'Blueprint Generation',
    fallback: 'Recovery Processing'
  };
  
  return stepNames[step];
}

function getOverallImpactColor(impact: number): string {
  if (impact >= 0.8) return '#22c55e'; // High impact - green
  if (impact >= 0.6) return '#f59e0b'; // Medium impact - amber
  if (impact >= 0.4) return '#ef4444'; // Low impact - red
  return '#6b7280'; // Very low impact - gray
}

