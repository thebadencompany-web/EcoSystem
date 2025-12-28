
import React from 'react';

const messages = [
  "Consulting with mother nature...",
  "Translating emotion into petals...",
  "Gathering starlight and dewdrops...",
  "Finding the perfect botanical arrangement...",
  "Weaving your memory into form...",
];

export const Loader: React.FC = () => {
  const [message, setMessage] = React.useState(messages[0]);

  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setMessage(prev => {
        const currentIndex = messages.indexOf(prev);
        const nextIndex = (currentIndex + 1) % messages.length;
        return messages[nextIndex];
      });
    }, 2500);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center h-96">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-navy-500"></div>
      <p className="mt-6 text-lg text-gray-600 font-serif transition-opacity duration-500">{message}</p>
    </div>
  );
};
