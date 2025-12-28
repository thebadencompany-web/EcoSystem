// components/MemoryInputForm.tsx
import React from 'react';

interface MemoryInputFormProps {
  onGenerate: (memory: string, baseImage: string | null) => void;
}

export const MemoryInputForm: React.FC<MemoryInputFormProps> = ({ onGenerate }) => {
  const [memory, setMemory] = React.useState('');
  const [baseImage, setBaseImage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBaseImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (memory.trim()) {
      setIsLoading(true);
      onGenerate(memory, baseImage);
      // Parent component will handle setting loading state back to false
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-3xl font-serif text-gray-800 mb-4">Create a Wreath from a Memory</h2>
            <p className="text-gray-600 mb-6">
                Share a cherished memory, and our master floral designer will translate its essence into a unique wreath, selecting the perfect layout and botanicals to tell your story.
            </p>
            <form onSubmit={handleSubmit}>
                <div className="mb-6">
                    <label htmlFor="memory" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Cherished Memory
                    </label>
                    <textarea
                        id="memory"
                        value={memory}
                        onChange={(e) => setMemory(e.target.value)}
                        placeholder="e.g., 'Walking with my grandmother in her garden on a sunny afternoon...'"
                        className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500 transition-shadow resize-none"
                        required
                    />
                </div>
                
                <div className="p-4 border-2 border-dashed rounded-lg text-center bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Start with a Wreath Base (Optional)</p>
                    {baseImage ? (
                         <div className="relative group w-32 h-32 mx-auto">
                            <img src={baseImage} alt="Wreath base preview" className="w-32 h-32 rounded-full object-cover shadow-md" />
                            <button 
                                type="button" 
                                onClick={() => {
                                    setBaseImage(null);
                                    if(fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove image"
                            >
                                &times;
                            </button>
                        </div>
                    ) : (
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()} 
                            className="text-sm font-medium transition-colors px-4 py-2 rounded-lg border-0"
                            style={{ color: '#1E3A5F', background: 'transparent' }}
                        >
                            Upload an image of your wreath base
                        </button>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        accept="image/png, image/jpeg"
                    />
                </div>

                <button
                    type="submit"
                    disabled={!memory.trim() || isLoading}
                    className="mt-6 w-full text-white py-3.5 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    style={{ backgroundColor: (!memory.trim() || isLoading) ? undefined : '#1E3A5F' }}
                >
                    {isLoading ? 'Designing...' : 'Design My Wreath'}
                </button>
            </form>
        </div>
    </div>
  );
};
