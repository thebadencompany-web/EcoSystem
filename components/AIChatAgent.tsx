// components/AIChatAgent.tsx
import React, { useState, useEffect, useRef } from 'react';
import type { WreathBlueprint, InventoryItem, ChatMessage, WreathElement, LayoutStyle, LioraResponse } from '../types';
import { lioraAgent } from '../services/aiAgents';

interface AIChatAgentProps {
    blueprint: WreathBlueprint;
    updateBlueprint: (bp: WreathBlueprint) => void;
    inventory: InventoryItem[];
}

const WelcomeMessage: ChatMessage = {
    id: 'welcome',
    role: 'model',
    text: "I'm your AI Design Assistant. You can ask me to make broad changes ('add 5 roses') or give precise commands ('place a fern at 90 degrees, 0.8 radius'). What should we create?"
};

export const AIChatAgent: React.FC<AIChatAgentProps> = ({ blueprint, updateBlueprint, inventory }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([WelcomeMessage]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text: input };
        const loadingMessage: ChatMessage = { id: `loading-${Date.now()}`, role: 'model', text: '...', isLoading: true };
        
        setMessages(prev => [...prev, userMessage, loadingMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response: LioraResponse = await lioraAgent(input, blueprint, inventory);
            
            let responseText = response.text;
            let functionsCalled = false;
            
            if (response.functionCalls && response.functionCalls.length > 0) {
                let tempBlueprint = { ...blueprint };
                for (const fc of response.functionCalls) {
                    tempBlueprint = await executeFunctionCall(fc, tempBlueprint);
                }
                updateBlueprint(tempBlueprint);
                functionsCalled = true;
            }

            if (!responseText && functionsCalled) {
                responseText = "Done! I've updated the blueprint for you.";
            } else if (!responseText && !functionsCalled) {
                responseText = "I'm sorry, I'm not sure how to do that. Can you try rephrasing?";
            }
            
            const modelMessage: ChatMessage = { id: `model-${Date.now()}`, role: 'model', text: responseText };
            setMessages(prev => [...prev.filter(m => !m.isLoading), modelMessage]);

        } catch (error) {
            console.error('AI Chat Error:', error);
            const errorMessage: ChatMessage = { id: `err-${Date.now()}`, role: 'model', text: 'Sorry, I encountered an error. Please try again.' };
            setMessages(prev => [...prev.filter(m => !m.isLoading), errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const executeFunctionCall = async (
        // FIX: The 'args' property on a FunctionCall from the API is optional. The type signature is updated to reflect this, and a guard clause is added to safely handle function calls without arguments.
        fc: { name?: string; args?: any },
        currentBlueprint: WreathBlueprint
    ): Promise<WreathBlueprint> => {
        let newBlueprint = { ...currentBlueprint };

        if (!fc.args) {
            console.warn(`Function call '${fc.name}' received without arguments.`);
            return newBlueprint;
        }

        switch (fc.name) {
            // == BROAD-STROKE TOOLS ==
            case 'add_elements': {
                const { elements_to_add } = fc.args;
                const newElements = [...newBlueprint.elements];
                for (const { inventoryId, quantity } of elements_to_add) {
                    const itemToAdd = inventory.find(i => i.id === inventoryId);
                    if (itemToAdd) {
                            for (let i = 0; i < quantity; i++) {
                            const uid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `el-${Date.now()}-${i}`;
                            const newElement: WreathElement = {
                                id: `el-${uid}`,
                                inventoryId: itemToAdd.id,
                                name: itemToAdd.name,
                                position: { angle: Math.random() * 360, radius: 0.5 + Math.random() * 0.4 },
                                rotation: Math.random() * 360,
                                layer: 2,
                                realWorldSizeInInches: { width: itemToAdd.dimensions.widthInches, height: itemToAdd.dimensions.heightInches },
                                tuckPoint: { x: 0.5, y: 0.5 },
                                // Propagate emotional metadata from the inventory item
                                emotionTags: itemToAdd.emotionTags || [],
                                symbolMeaning: itemToAdd.symbolMeaning,
                                culturalTags: itemToAdd.culturalTags || [],
                                emotionalWeight: itemToAdd.emotionalDimensions?.valence ?? 0.5,
                            };
                            newElements.push(newElement);
                        }
                    }
                }
                newBlueprint.elements = newElements;
                break;
            }
            case 'remove_elements_by_name': {
                const { elementName } = fc.args;
                newBlueprint.elements = newBlueprint.elements.filter(el => !el.name.toLowerCase().includes(elementName.toLowerCase()));
                break;
            }
            case 'modify_layout': {
                 newBlueprint.layoutStyle = fc.args.newLayoutStyle as LayoutStyle;
                break;
            }

            // == PRECISION TOOLS ==
            case 'add_element_with_details': {
                const { inventoryId, position, rotation, layer, tuckPoint } = fc.args;
                const itemToAdd = inventory.find(i => i.id === inventoryId);
                if (itemToAdd) {
                    const uid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `el-${Date.now()}`;
                    const newElement: WreathElement = {
                        id: `el-${uid}`,
                        inventoryId: itemToAdd.id,
                        name: itemToAdd.name,
                        position,
                        rotation,
                        layer,
                        realWorldSizeInInches: { width: itemToAdd.dimensions.widthInches, height: itemToAdd.dimensions.heightInches },
                        tuckPoint,
                        emotionTags: itemToAdd.emotionTags || [],
                        symbolMeaning: itemToAdd.symbolMeaning,
                        culturalTags: itemToAdd.culturalTags || [],
                        emotionalWeight: itemToAdd.emotionalDimensions?.valence ?? 0.5,
                    };
                    newBlueprint.elements = [...newBlueprint.elements, newElement];
                }
                break;
            }
            case 'modify_elements': {
                const { elementName, updates } = fc.args;
                newBlueprint.elements = newBlueprint.elements.map(el => {
                    if (el.name.toLowerCase().includes(elementName.toLowerCase())) {
                        const newPosition = updates.position ? { ...el.position, ...updates.position } : el.position;
                        const newTuckPoint = updates.tuckPoint ? { ...el.tuckPoint, ...updates.tuckPoint } : el.tuckPoint;
                        
                        return {
                            ...el,
                            ...updates,
                            position: newPosition,
                            tuckPoint: newTuckPoint,
                        };
                    }
                    return el;
                });
                break;
            }
            case 'remove_element_by_id': {
                const { elementId } = fc.args;
                newBlueprint.elements = newBlueprint.elements.filter(el => el.id !== elementId);
                break;
            }
            default:
                console.warn(`Unknown function call: ${fc.name}`);
        }
        return newBlueprint;
    };

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                         {msg.role === 'model' && <div className="w-6 h-6 bg-navy-600 rounded-full flex-shrink-0"></div>}
                        <div className={`px-4 py-2 rounded-lg max-w-xs md:max-w-md ${
                            msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800 border'
                        }`}>
                            {msg.isLoading ? (
                                <div className="flex items-center space-x-1">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-0"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-150"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-300"></span>
                                </div>
                            ) : (
                                <p className="text-sm">{msg.text}</p>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-2 border-t bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask the AI to make a change..."
                        className="flex-grow p-2 border rounded-md text-sm focus:ring-2 focus:ring-navy-500"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="bg-navy-600 text-white px-4 rounded-md hover:bg-navy-700 disabled:bg-gray-400 transition-colors"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};