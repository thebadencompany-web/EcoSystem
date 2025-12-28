// components/AgentDashboard.tsx
import React, { useState } from 'react';
import { AgentSelector } from './AgentSelector';
import { InputPanel } from './InputPanel';
import { OutputViewer } from './OutputViewer';
import { EmotionalScore } from './EmotionalScore';
import { DelegationPreview } from './DelegationPreview';
import '../styles/dashboard.css';

export const AgentDashboard: React.FC = () => {
  const [selectedAgentName, setSelectedAgentName] = useState<string | null>(null);
  const [agentInput, setAgentInput] = useState<string>('');
  const [agentOutput, setAgentOutput] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = (output: any) => {
    setAgentOutput(output);
    setError(null);
  };
  
  const handleError = (err: Error) => {
    setError(err.message);
    setAgentOutput(null);
  }

  return (
    <div className="dashboard">
      <AgentSelector onSelect={setSelectedAgentName} selectedAgent={selectedAgentName} />
      <InputPanel
        selectedAgentName={selectedAgentName}
        onRun={handleRun}
        onError={handleError}
        isRunning={isRunning}
        setIsRunning={setIsRunning}
        onInputChange={setAgentInput}
      />
      <OutputViewer output={agentOutput} error={error} isLoading={isRunning} />
      <EmotionalScore content={JSON.stringify(agentOutput)} />
      <DelegationPreview input={agentInput} />
    </div>
  );
};
