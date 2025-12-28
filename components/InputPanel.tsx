// components/InputPanel.tsx
import React, { useState, useEffect } from 'react';
import { agentMap } from '../lib/agentMap';

interface InputPanelProps {
  selectedAgentName: string | null;
  onRun: (output: any) => void;
  onError: (error: Error) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  onInputChange: (input: string) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  selectedAgentName,
  onRun,
  onError,
  isRunning,
  setIsRunning,
  onInputChange
}) => {
  const [input, setInput] = useState('');

  useEffect(() => {
    // When the selected agent changes, clear the input field.
    const defaultInput = '';
    setInput(defaultInput);
    onInputChange(defaultInput);
  }, [selectedAgentName, onInputChange]);

  const handleRunAgent = async () => {
    const selectedAgent = agentMap.find((a) => a.name === selectedAgentName);
    if (!selectedAgent) return;

    setIsRunning(true);
    try {
      let args: any[];
      try {
        // Attempt to parse the input as JSON.
        // If it's an array, we'll use it as arguments for multi-arg functions.
        // If it's another JSON type (object, number, etc.), we wrap it in an array to be a single argument.
        const parsed = JSON.parse(input);
        args = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // If JSON.parse fails, it's a plain string. Wrap it in an array to be a single argument.
        args = [input];
      }

      // FIX: Use .apply() to call the agent function with the dynamic 'args' array.
      // This resolves the TypeScript error "A spread argument must either have a tuple type or be passed to a rest parameter."
      // by correctly handling cases where the number and types of arguments are not known at compile time.
      const result = await selectedAgent.fn.apply(null, args);
      onRun(result);
    } catch (err) {
      onError(err instanceof Error ? err : new Error('An unknown error occurred'));
    } finally {
      setIsRunning(false);
    }
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    onInputChange(e.target.value);
  }

  return (
    <div>
      <h3>Agent Input (JSON or Text)</h3>
      <textarea
        value={input}
        onChange={handleTextChange}
        placeholder="Enter JSON or text input for the agent..."
      />
      <button
        onClick={handleRunAgent}
        disabled={isRunning || !selectedAgentName}
      >
        {isRunning ? 'Running...' : `Run ${selectedAgentName || ''}`}
      </button>
    </div>
  );
};