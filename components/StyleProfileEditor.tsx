// components/StyleProfileEditor.tsx
import React, { useState, useEffect } from 'react';
import type { UserStyleProfile } from '../types';

interface StyleProfileEditorProps {
    styleProfile: UserStyleProfile | null;
    setStyleProfile: (profile: UserStyleProfile) => void;
}

export const StyleProfileEditor: React.FC<StyleProfileEditorProps> = ({ styleProfile, setStyleProfile }) => {
    const [notes, setNotes] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        setNotes(styleProfile?.aestheticNotes || '');
    }, [styleProfile]);
    
    const handleSave = () => {
        const newProfile: UserStyleProfile = {
            id: 'singleton',
            aestheticNotes: notes,
        };
        setStyleProfile(newProfile);
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 2000);
    };

    const initialProfileText = "Your style profile is currently empty. As you create schematics in the 'Architect' and then save the final blueprints in the 'Studio', the AI will analyze your changes and add notes here about your design preferences. You can also add your own notes to guide the AI!";

    return (
        <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in max-w-3xl mx-auto">
             <h2 className="text-2xl font-serif text-gray-800 mb-4">My Style Profile</h2>
            <p className="text-gray-600 mb-6">
                This is the AI's understanding of your unique design aesthetic. It learns and updates this profile based on the creative choices you make. You can also edit these notes directly to guide its future suggestions.
            </p>
            
            <textarea
                value={notes || initialProfileText}
                onChange={(e) => setNotes(e.target.value)}
                readOnly={!styleProfile}
                className={`w-full h-80 p-4 border rounded-md font-mono text-sm resize-none ${!styleProfile ? 'bg-gray-100 text-gray-500' : 'bg-white'}`}
            />

            <div className="mt-6 flex justify-end relative">
                <button 
                    onClick={handleSave}
                    disabled={!styleProfile}
                    className="bg-navy-600 text-white px-6 py-2 rounded-md hover:bg-navy-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    Save Profile
                </button>
                {showConfirmation && (
                    <div className="absolute top-0 right-0 -mt-10 bg-green-500 text-white text-sm px-3 py-1 rounded-md shadow-lg animate-fade-in">
                        Saved!
                    </div>
                )}
            </div>
        </div>
    );
};