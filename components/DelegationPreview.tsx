// components/DelegationPreview.tsx
import React from 'react';
import { delegationMap } from '../lib/delegationMap';

interface DelegationPreviewProps {
  input: string;
}

export const DelegationPreview: React.FC<DelegationPreviewProps> = ({ input }) => {
  const lowerInput = input.toLowerCase();
  
  const matched = delegationMap.find((route) =>
    route.keywords.some((kw) => lowerInput.includes(kw))
  );

  return (
    <div>
      <h3>Delegation Preview</h3>
      <p>Based on input, `pulseSwitchAgent` would route to:</p>
      <p>
        <strong>{matched ? matched.agent : 'lioraAgent (default)'}</strong>
      </p>
    </div>
  );
};
