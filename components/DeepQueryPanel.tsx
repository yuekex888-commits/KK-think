
import React from 'react';
import { DeepQuery } from '../types';
import { User, Code, Sparkles, CheckCheck } from 'lucide-react';

interface Props {
  queries: DeepQuery[];
  onQueryChange: (id: string, field: 'selectedOption' | 'customAnswer', value: string) => void;
  isLoading: boolean;
}

export const DeepQueryPanel: React.FC<Props> = ({ queries, onQueryChange, isLoading }) => {
  const productQueries = queries.filter(q => q.agent === 'Product');
  const programmerQueries = queries.filter(q => q.agent === 'Programmer');

  const handleOptionClick = (q: DeepQuery, opt: string) => {
    if (isLoading) return;
    if (q.selectedOption === opt) {
      onQueryChange(q.id, 'selectedOption', '');
    } else {
      onQueryChange(q.id, 'selectedOption', opt);
    }
  };

  const handleAdoptRecommendation = (q: DeepQuery) => {
    if (isLoading || q.options.length === 0) return;
    // Assume first option is recommendation
    onQueryChange(q.id, 'selectedOption', q.options[0]);
  };

  const renderQueryCard = (q: DeepQuery, colorClass: string, ringClass: string) => (
    <div key={q.id} className={`bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-3 last:mb-0 transition-all hover:shadow-md animate-in slide-in-from-left-2 duration-300 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-start gap-2 mb-2">
         <p className="text-sm font-medium text-gray-800 leading-snug flex-1">{q.question}</p>
         {q.options.length > 0 && (
           <button 
             onClick={() => handleAdoptRecommendation(q)}
             disabled={isLoading}
             className="shrink-0 text-[10px] flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-full border border-amber-100 hover:bg-amber-100 transition-colors"
             title="自动选择第一个推荐选项"
           >
             <Sparkles size={10} />
             采纳推荐
           </button>
         )}
      </div>
      
      <div className="space-y-2">
        {q.options.map((opt, idx) => (
          <label key={idx} className={`flex items-start gap-2 text-xs text-gray-600 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-all duration-200 ${isLoading ? 'cursor-not-allowed' : ''} ${q.selectedOption === opt ? 'bg-indigo-50/50' : ''}`}>
            <input
              type="radio"
              name={`query-${q.id}`}
              checked={q.selectedOption === opt}
              onClick={(e) => handleOptionClick(q, opt)}
              onChange={() => {}}
              disabled={isLoading}
              className={`mt-0.5 ${colorClass} ${ringClass} cursor-pointer transition-transform duration-200 ${q.selectedOption === opt ? 'scale-110' : ''}`}
            />
            <span className={q.selectedOption === opt ? 'font-bold text-gray-800' : ''}>{opt}</span>
            {idx === 0 && <span className="text-[9px] text-amber-500 border border-amber-200 px-1 rounded ml-auto">荐</span>}
          </label>
        ))}
        {q.allowCustom && (
          <input
            type="text"
            placeholder="自定义输入..."
            value={q.customAnswer || ''}
            onChange={(e) => onQueryChange(q.id, 'customAnswer', e.target.value)}
            disabled={isLoading}
            className="w-full text-xs p-2 border border-gray-200 rounded mt-1 focus:outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition-colors disabled:bg-gray-100"
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-xl w-full">
      <div className="p-3 border-b border-gray-200 bg-gray-50 font-bold text-gray-700 flex items-center gap-2 flex-shrink-0 z-20 relative">
        <CheckCheck size={16} className="text-amber-500"/>
        深度问询 (需确认细节)
      </div>

      {/* Top: Product Manager Questions */}
      <div className="flex-1 overflow-y-auto p-4 border-b border-gray-200 bg-orange-50/30 relative scroll-smooth">
        <h3 className="text-sm font-bold text-orange-700 mb-3 flex items-center gap-2 sticky top-[-1px] bg-orange-50/95 backdrop-blur-sm py-2 z-10 w-full shadow-sm rounded-b-lg">
          <User size={16}/>
          产品师
          <span className="text-xs font-normal text-gray-500 ml-auto">{productQueries.length} 个问题</span>
        </h3>
        <div className="pb-2">
          {productQueries.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center mt-10 animate-pulse">产品师暂无疑问。</p>
          ) : (
            productQueries.map(q => renderQueryCard(q, 'text-orange-600', 'focus:ring-orange-500'))
          )}
        </div>
      </div>

      {/* Bottom: Programmer Questions */}
      <div className="flex-1 overflow-y-auto p-4 bg-blue-50/30 relative scroll-smooth">
        <h3 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2 sticky top-[-1px] bg-blue-50/95 backdrop-blur-sm py-2 z-10 w-full shadow-sm rounded-b-lg">
          <Code size={16}/>
          程序猿
          <span className="text-xs font-normal text-gray-500 ml-auto">{programmerQueries.length} 个问题</span>
        </h3>
        <div className="pb-2">
          {programmerQueries.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center mt-10 animate-pulse">程序猿暂无疑问。</p>
          ) : (
            programmerQueries.map(q => renderQueryCard(q, 'text-blue-600', 'focus:ring-blue-500'))
          )}
        </div>
      </div>
    </div>
  );
};
