
import React from 'react';
import { Criticism } from '../types';
import { MessageSquareWarning, X } from 'lucide-react';

interface Props {
  criticisms: Criticism[];
  onClose: (id: string) => void;
}

export const CriticismBubbles: React.FC<Props> = ({ criticisms, onClose }) => {
  if (criticisms.length === 0) return null;

  return (
    <div className="absolute bottom-6 left-0 w-full flex flex-col items-center z-40 pointer-events-none gap-2 px-6">
      {/* Header Badge */}
      <div className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 mb-1">
        <MessageSquareWarning size={12} />
        智能体 F (挑刺师) 的吐槽
      </div>
      
      {/* Bubbles Container - Horizontal */}
      <div className="flex flex-row justify-center items-end gap-3 w-full overflow-x-auto pb-2 scrollbar-hide">
        {criticisms.map((c, idx) => (
          <div 
            key={c.id}
            style={{ animationDelay: `${idx * 100}ms` }}
            className="pointer-events-auto bg-white/90 border border-red-200 text-red-900 text-xs px-3 py-2 rounded-xl shadow-md min-w-[180px] max-w-[240px] animate-in fade-in slide-in-from-bottom-6 duration-500 hover:scale-105 hover:-translate-y-1 transition-all hover:shadow-lg hover:z-10 group shrink-0 backdrop-blur-sm"
          >
            <div className="flex justify-between items-start gap-2">
               <span className="leading-snug break-words font-medium select-none">“{c.text}”</span>
               <button 
                onClick={() => onClose(c.id)}
                className="text-red-300 hover:text-red-600 transition-colors shrink-0"
               >
                 <X size={12} />
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
