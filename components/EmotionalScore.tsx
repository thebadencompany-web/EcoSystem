// components/EmotionalScore.tsx
import React from 'react';
import { scoreEmotionalImpact } from '../lib/scoreEmotionalImpact';

interface EmotionalScoreProps {
  content: string;
}

const ScoreBar: React.FC<{ label: string; score: number }> = ({ label, score }) => (
  <div>
    <div className="flex justify-between text-xs text-gray-600">
      <span>{label}</span>
      <span className="font-semibold">{score}/10</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
      <div className="bg-navy-500 h-1.5 rounded-full" style={{ width: `${score * 10}%` }} />
    </div>
  </div>
);

export const EmotionalScore: React.FC<EmotionalScoreProps> = ({ content }) => {
  // Avoid scoring empty or null content
  if (!content || content === 'null') {
    return (
        <div>
            <h3>Emotional Impact</h3>
            <p className="text-xs text-gray-400 text-center mt-4">Run an agent to see its score.</p>
        </div>
    );
  }

  const score = scoreEmotionalImpact(content);
  
  return (
    <div>
      <h3>Emotional Impact</h3>
      <div className="space-y-3 mt-2">
        <ScoreBar label="Clarity" score={score.clarity} />
        <ScoreBar label="Resonance" score={score.resonance} />
        <ScoreBar label="Manufacturability" score={score.manufacturability} />
      </div>
    </div>
  );
};
