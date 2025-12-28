// components/BlueprintLibrary.tsx
import React, { useState } from 'react';
import type { WreathBlueprint, BlueprintSchematic } from '../types';

interface BlueprintLibraryProps {
    blueprints: WreathBlueprint[];
    schematics: BlueprintSchematic[];
    removeBlueprint: (id: string) => void;
    removeSchematic: (id: string) => void;
    onSelectBlueprint: (blueprintId: string) => void;
    onSelectSchematic: (schematic: BlueprintSchematic) => void;
}

type LibraryTab = 'blueprints' | 'schematics';

const TabButton: React.FC<{ active: boolean, onClick: () => void, count: number, children: React.ReactNode }> = ({ active, onClick, count, children }) => (
    <button
        onClick={onClick}
        className={`px-3 py-2 text-sm font-medium leading-5 rounded-md focus:outline-none transition-colors ${
            active ? 'bg-navy-50 text-navy-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
    >
        {children} <span className="ml-1 bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">{count}</span>
    </button>
);


export const BlueprintLibrary: React.FC<BlueprintLibraryProps> = ({ 
    blueprints, 
    schematics,
    removeBlueprint, 
    removeSchematic,
    onSelectBlueprint,
    onSelectSchematic,
}) => {
    const [activeTab, setActiveTab] = useState<LibraryTab>('blueprints');

    const renderSchematics = () => (
        <>
            {schematics.length === 0 ? (
                <p className="text-gray-500 text-center py-8 col-span-full">
                    You haven't created any schematics yet. Go to the 'Architect' to design a new concept.
                </p>
            ) : (
                schematics.map(sc => (
                    <div key={sc.id} className="bg-gray-50 p-4 rounded-lg shadow-sm flex flex-col justify-between border hover:border-navy-500 transition-colors group">
                        <div>
                            <div className="aspect-square bg-white rounded-md mb-3 border overflow-hidden cursor-pointer" onClick={() => onSelectSchematic(sc)}>
                                 <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: sc.svgContent }} />
                            </div>
                            <h4 className="font-bold text-gray-800 truncate">{sc.name}</h4>
                            <p className="text-xs text-gray-500 mb-2 truncate italic">"{sc.prompt}"</p>
                        </div>
                        <div className="mt-2 pt-2 border-t flex items-center justify-between">
                             <button onClick={() => onSelectSchematic(sc)} className="text-xs bg-navy-600 text-white px-3 py-1 rounded-md hover:bg-navy-700 transition-colors opacity-0 group-hover:opacity-100">
                                Develop
                            </button>
                            <button onClick={() => removeSchematic(sc.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                        </div>
                    </div>
                ))
            )}
        </>
    );

    const renderBlueprints = () => (
        <>
            {blueprints.length === 0 ? (
                 <p className="text-gray-500 text-center py-8 col-span-full">
                    You haven't saved any final blueprints yet. Develop a schematic or create a design in the Studio.
                </p>
            ) : (
                blueprints.map(bp => (
                     <div key={bp.id} className="bg-gray-50 p-4 rounded-lg shadow-sm flex flex-col justify-between border hover:border-navy-500 transition-colors group">
                        <div>
                            <div className="aspect-square bg-white rounded-md mb-3 border overflow-hidden cursor-pointer" onClick={() => onSelectBlueprint(bp.id)}>
                                <div 
                                    className="w-full h-full bg-cover bg-center" 
                                    style={{ backgroundImage: bp.wreathBaseImageUrl ? `url(${bp.wreathBaseImageUrl})` : 'none' }}
                                >
                                    {/* Minimal representation of elements */}
                                    <svg viewBox="0 0 100 100" className="w-full h-full">
                                        {bp.elements.map(el => (
                                            <circle 
                                                key={el.id} 
                                                cx={50 + (el.position.radius * 45 * Math.cos((el.position.angle-90) * Math.PI/180))} 
                                                cy={50 + (el.position.radius * 45 * Math.sin((el.position.angle-90) * Math.PI/180))}
                                                r="2"
                                                fill="rgba(0,0,0,0.3)"
                                            />
                                        ))}
                                    </svg>
                                </div>
                            </div>
                            <h4 className="font-bold text-gray-800 truncate">{bp.name}</h4>
                            <p className="text-xs text-gray-500 mb-2 truncate italic">"{bp.description}"</p>
                        </div>
                        <div className="mt-2 pt-2 border-t flex items-center justify-between">
                             <button onClick={() => onSelectBlueprint(bp.id)} className="text-xs bg-navy-600 text-white px-3 py-1 rounded-md hover:bg-navy-700 transition-colors opacity-0 group-hover:opacity-100">
                                Edit
                            </button>
                            <button onClick={() => removeBlueprint(bp.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                        </div>
                    </div>
                ))
            )}
        </>
    );

    return (
        <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif text-gray-800">Asset Library</h2>
                <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg">
                    <TabButton active={activeTab === 'blueprints'} onClick={() => setActiveTab('blueprints')} count={blueprints.length}>
                        Blueprints
                    </TabButton>
                     <TabButton active={activeTab === 'schematics'} onClick={() => setActiveTab('schematics')} count={schematics.length}>
                        Schematics
                    </TabButton>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeTab === 'blueprints' ? renderBlueprints() : renderSchematics()}
            </div>

        </div>
    );
};