
import React, { useState } from 'react';
import { AISettings, AgentPrompts } from '../types';
import { Settings, X, Users, Server, UserCog, MessageSquareWarning } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSave: (s: AISettings) => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'agents'>('general');

  if (!isOpen) return null;

  const handleAgentPromptChange = (key: keyof AgentPrompts, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      agentPrompts: {
        ...prev.agentPrompts,
        [key]: value
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <Settings className="w-6 h-6 text-indigo-600" />
            系统设置 & 智能体配置
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 px-6 shrink-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'general' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Server size={16} />
            通用 / API 设置
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`py-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'agents' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={16} />
            智能体身份配置 (6 Agents)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {activeTab === 'general' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-left-2">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">API 端点 (Base URL)</label>
                <input 
                  type="text" 
                  value={localSettings.baseUrl}
                  onChange={(e) => setLocalSettings({...localSettings, baseUrl: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                  placeholder="https://api.openai.com/v1/chat/completions"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">API 密钥 (Key)</label>
                <input 
                  type="password" 
                  value={localSettings.apiKey}
                  onChange={(e) => setLocalSettings({...localSettings, apiKey: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                  placeholder="sk-..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">模型名称 (Model)</label>
                <input 
                  type="text" 
                  value={localSettings.model}
                  onChange={(e) => setLocalSettings({...localSettings, model: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                  placeholder="gpt-4o or gemini-1.5-pro"
                />
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
              <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-2">
                <UserCog size={16} className="text-blue-500 mt-0.5 shrink-0"/>
                在这里自定义每个智能体的“人设”提示词。这些设定将直接影响 AI 的回复风格、关注点以及生成的文档质量。
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-blue-700 flex items-center gap-2 mb-1">
                    智能体 A: 程序猿 (IT 分析师)
                  </label>
                  <textarea 
                    value={localSettings.agentPrompts.programmer}
                    onChange={(e) => handleAgentPromptChange('programmer', e.target.value)}
                    className="w-full h-20 border border-blue-200 bg-blue-50/20 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-orange-700 flex items-center gap-2 mb-1">
                    智能体 B: 产品师 (应用分析师)
                  </label>
                  <textarea 
                    value={localSettings.agentPrompts.product}
                    onChange={(e) => handleAgentPromptChange('product', e.target.value)}
                    className="w-full h-20 border border-orange-200 bg-orange-50/20 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-indigo-700 flex items-center gap-2 mb-1">
                    智能体 C: 绘图师 (思维导图专家)
                  </label>
                  <textarea 
                    value={localSettings.agentPrompts.mapper}
                    onChange={(e) => handleAgentPromptChange('mapper', e.target.value)}
                    className="w-full h-20 border border-indigo-200 bg-indigo-50/20 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-purple-700 flex items-center gap-2 mb-1">
                    智能体 D: 总结师 (核心归纳)
                  </label>
                  <textarea 
                    value={localSettings.agentPrompts.summarizer}
                    onChange={(e) => handleAgentPromptChange('summarizer', e.target.value)}
                    className="w-full h-20 border border-purple-200 bg-purple-50/20 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-green-700 flex items-center gap-2 mb-1">
                    智能体 E: 提示词工程师 (Prompt Engineer)
                  </label>
                  <textarea 
                    value={localSettings.agentPrompts.promptEngineer}
                    onChange={(e) => handleAgentPromptChange('promptEngineer', e.target.value)}
                    className="w-full h-20 border border-green-200 bg-green-50/20 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-red-700 flex items-center gap-2 mb-1">
                    <MessageSquareWarning size={14}/>
                    智能体 F: 挑刺师 (毒舌评论家)
                  </label>
                  <textarea 
                    value={localSettings.agentPrompts.critic}
                    onChange={(e) => handleAgentPromptChange('critic', e.target.value)}
                    className="w-full h-20 border border-red-200 bg-red-50/20 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-xl">
          <button onClick={onClose} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors">取消</button>
          <button 
            onClick={() => { onSave(localSettings); onClose(); }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-md hover:shadow-lg transition-all"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};
