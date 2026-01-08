import React from 'react';
import { Suggestion } from '../types';
import { MessageSquare, Send, CheckCircle, User, Code } from 'lucide-react';

interface Props {
  instruction: string;
  onInstructionChange: (val: string) => void;
  suggestions: Suggestion[];
  onSuggestionToggle: (id: string) => void;
  onAcceptAllSuggestions: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const InteractionPanel: React.FC<Props> = ({ 
  instruction, 
  onInstructionChange, 
  suggestions, 
  onSuggestionToggle, 
  onAcceptAllSuggestions,
  onSubmit, 
  isLoading 
}) => {
  const productSuggestions = suggestions.filter(s => s.agent === 'Product');
  const programmerSuggestions = suggestions.filter(s => s.agent === 'Programmer');

  const renderSuggestionCard = (s: Suggestion, accentColor: string, icon: React.ReactNode) => (
    <div 
      key={s.id} 
      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${s.accepted ? `bg-${accentColor}-50 border-${accentColor}-300 shadow-inner` : `bg-white border-${accentColor}-100 hover:border-${accentColor}-300 shadow-sm`}`}
      onClick={() => !isLoading && onSuggestionToggle(s.id)}
    >
      <div className={`mt-0.5 min-w-[16px] h-4 border rounded flex items-center justify-center transition-colors ${s.accepted ? `bg-${accentColor}-500 border-${accentColor}-500` : 'border-gray-300 bg-gray-50'}`}>
        {s.accepted && <CheckCircle size={12} className="text-white"/>}
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-700 leading-relaxed">{s.text}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl w-full">
      
      {/* 1. AI Instruction */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0 bg-indigo-50/50 z-20 relative">
        <h3 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2">
          <MessageSquare size={16}/>
          1. AI 指令 (您的需求)
        </h3>
        <textarea
          className="w-full h-32 p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm resize-none bg-white placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
          placeholder="告诉 AI 您想修改什么..."
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          disabled={isLoading}
        />
      </div>

      {/* 2. Suggestions Header */}
      <div className="flex justify-between items-center p-3 border-b border-gray-200 bg-emerald-50 z-10 shadow-sm shrink-0">
        <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
          <CheckCircle size={16}/>
          3. 优化建议 ({suggestions.length})
        </h3>
        {suggestions.length > 0 && (
            <button 
              onClick={onAcceptAllSuggestions} 
              disabled={isLoading}
              className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              全部采纳
            </button>
        )}
      </div>

      {/* Suggestions List (Split) */}
      <div className={`flex-1 overflow-y-auto bg-gray-50/50 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
        
        {/* Product Suggestions */}
        <div className="p-4 border-b border-gray-100 bg-orange-50/30">
           <h4 className="text-xs font-bold text-orange-700 mb-2 flex items-center gap-2">
              <User size={14}/>
              产品师建议 (UX/业务)
              <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full text-[10px]">{productSuggestions.length}</span>
           </h4>
           <div className="space-y-2">
              {productSuggestions.length === 0 && <p className="text-xs text-gray-400 italic pl-6">暂无建议</p>}
              {productSuggestions.map(s => renderSuggestionCard(s, 'orange', <User size={12}/>))}
           </div>
        </div>

        {/* Programmer Suggestions */}
        <div className="p-4 bg-blue-50/30 pb-6">
           <h4 className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-2">
              <Code size={14}/>
              程序猿建议 (技术/逻辑)
              <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-[10px]">{programmerSuggestions.length}</span>
           </h4>
           <div className="space-y-2">
              {programmerSuggestions.length === 0 && <p className="text-xs text-gray-400 italic pl-6">暂无建议</p>}
              {programmerSuggestions.map(s => renderSuggestionCard(s, 'blue', <Code size={12}/>))}
           </div>
        </div>

      </div>

      {/* Submit */}
      <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0 z-20 relative">
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className={`
            w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-white shadow-lg shadow-indigo-200
            transition-all transform active:scale-[0.98]
            ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'}
          `}
        >
          {isLoading ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"/>
              智能体团队工作中...
            </>
          ) : (
            <>
              <Send size={18} />
              一键提交 (Agents Start)
            </>
          )}
        </button>
      </div>
    </div>
  );
};
