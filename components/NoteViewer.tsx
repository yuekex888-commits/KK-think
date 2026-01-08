import React from 'react';
import { BookOpen, FileText, X } from 'lucide-react';

interface Props {
  noteA: string;
  noteB: string;
  isOpen: boolean;
  onClose: () => void;
}

export const NoteViewer: React.FC<Props> = ({ noteA, noteB, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = React.useState<'A' | 'B'>('B'); // Default to B (The spec)

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 bg-white/95 backdrop-blur-sm flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom-10">
      
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shadow-sm shrink-0">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('B')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'B' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <FileText size={16}/>
            Note B (详细规格书 - 智能体D)
          </button>
          <button 
            onClick={() => setActiveTab('A')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'A' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <BookOpen size={16}/>
            Note A (历史记录 - 线性)
          </button>
        </div>
        
        <div className="flex items-center gap-4">
           <span className="text-xs text-gray-400">
             {activeTab === 'A' ? '记录用户交互历史 (只读)' : '记录软件详细设计细节 (只读)'}
           </span>
           <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
             <X size={20}/>
           </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8 min-h-full">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-800">
            {activeTab === 'A' ? noteA : noteB}
          </pre>
        </div>
      </div>
      
    </div>
  );
};
