// components/AgentSelector.tsx
import React, { useEffect } from 'react';
import { agentMap } from '../lib/agentMap';

interface AgentSelectorProps {
  onSelect: (agentName: string | null) => void;
  selectedAgent: string | null;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ onSelect, selectedAgent }) => {
    
  // Select the first agent by default on mount
  useEffect(() => {
    if (!selectedAgent && agentMap.length > 0) {
      onSelect(agentMap[0].name);
    }
  }, [selectedAgent, onSelect]);

  return (
    <div>
      <label htmlFor="agent-selector">
        Select an Agent to Test
      </label>
      <select
        id="agent-selector"
        value={selectedAgent || ''}
        onChange={(e) => onSelect(e.target.value || null)}
      >
        {agentMap.map((agent) => (
          <option key={agent.name} value={agent.name}>
            {agent.label}
          </option>
        ))}
      </select>
    </div>
  );
};
