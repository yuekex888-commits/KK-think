
import React, { useState, useEffect } from 'react';
import { Settings, Save, FolderOpen, Plus, Undo, Redo, FileText, Cpu, Code, Check, Copy } from 'lucide-react';
import { Project, MindMapNode, AISettings, DeepQuery, Suggestion, Criticism } from './types';
import { DEFAULT_SETTINGS, INITIAL_PROJECT } from './constants';
import { MindMap } from './components/MindMap';
import { InteractionPanel } from './components/InteractionPanel';
import { DeepQueryPanel } from './components/DeepQueryPanel';
import { NoteViewer } from './components/NoteViewer';
import { SettingsModal } from './components/SettingsModal';
import { CriticismBubbles } from './components/CriticismBubbles';
import { runMultiAgentWorkflow, generatePromptForAIStudio } from './services/aiService';

const MAX_HISTORY = 15;

export default function App() {
  const [settings, setSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem('ai_studio_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [history, setHistory] = useState<{ past: Project[], present: Project, future: Project[] }>({
    past: [],
    present: INITIAL_PROJECT,
    future: []
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // --- Lifted Interaction State ---
  const [userInstruction, setUserInstruction] = useState('');
  const [activeQueries, setActiveQueries] = useState<DeepQuery[]>([]);
  const [activeSuggestions, setActiveSuggestions] = useState<Suggestion[]>([]);
  const [activeCriticisms, setActiveCriticisms] = useState<Criticism[]>([]);

  useEffect(() => {
    localStorage.setItem('ai_studio_settings', JSON.stringify(settings));
  }, [settings]);

  // --- History Management ---
  const pushHistory = (newProject: Project) => {
    setHistory(prev => {
      const newPast = [...prev.past, prev.present].slice(-MAX_HISTORY);
      return {
        past: newPast,
        present: newProject,
        future: []
      };
    });
  };

  const handleUndo = () => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const newPresent = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);
      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future]
      };
    });
  };

  const handleRedo = () => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const newPresent = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture
      };
    });
  };

  // --- File Operations ---
  const handleNewProject = () => {
    if (confirm("新建项目？当前未保存的更改将会丢失。")) {
      setHistory({ past: [], present: { ...INITIAL_PROJECT, id: Date.now().toString(), lastModified: Date.now() }, future: [] });
      setActiveQueries([]);
      setActiveSuggestions([]);
      setActiveCriticisms([]);
      setUserInstruction('');
      setGeneratedPrompt(null);
    }
  };

  const handleSaveProject = () => {
    const data = JSON.stringify(history.present);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-studio-project-${history.present.name.replace(/\s+/g, '-')}.json`;
    a.click();
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const loaded = JSON.parse(ev.target?.result as string) as Project;
        if (!loaded.mindMap || !loaded.noteA || !loaded.noteB) throw new Error("Invalid format");
        setHistory({ past: [], present: loaded, future: [] });
        setActiveQueries([]); // Clear ephemeral interaction state on load
        setActiveSuggestions([]);
        setActiveCriticisms([]);
        setUserInstruction('');
        setGeneratedPrompt(null);
      } catch (err) {
        alert("无法加载项目文件。");
      }
    };
    reader.readAsText(file);
  };

  // --- Interaction Handlers ---
  const handleQueryChange = (id: string, field: 'selectedOption' | 'customAnswer', value: string) => {
    setActiveQueries(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleSuggestionToggle = (id: string) => {
    setActiveSuggestions(prev => prev.map(s => s.id === id ? { ...s, accepted: !s.accepted } : s));
  };

  const handleAcceptAllSuggestions = () => {
    setActiveSuggestions(prev => prev.map(s => ({ ...s, accepted: true })));
  };

  const handleDismissCriticism = (id: string) => {
    setActiveCriticisms(prev => prev.filter(c => c.id !== id));
  };

  const handleCopyPrompt = async () => {
    if (!generatedPrompt) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
      alert('复制失败，请尝试手动选择复制');
    }
  };

  // --- Core Agent Logic ---

  const handleCombinedSubmit = async () => {
    const relevantQueries = activeQueries.filter(q => q.selectedOption || q.customAnswer);
    const relevantSuggestions = activeSuggestions.filter(s => s.accepted);

    if (!userInstruction && relevantQueries.length === 0 && relevantSuggestions.length === 0) return;

    setIsLoading(true);
    // Optionally clear criticisms on new submit, or keep them until manually dismissed?
    // Let's clear them to make room for new ones.
    setActiveCriticisms([]); 

    try {
      // 1. Construct new Note A entry (The Log) locally first
      const timestamp = new Date().toLocaleString('zh-CN');
      let logEntry = `\n--------------------------------------------------\n[时间]: ${timestamp}\n`;
      
      if (userInstruction) {
        logEntry += `[用户指令]: ${userInstruction}\n`;
      }
      
      if (relevantQueries.length > 0) {
        logEntry += `[深度问询回答]:\n`;
        relevantQueries.forEach(q => {
          logEntry += `  - 问(${q.agent}): ${q.question}\n    答: ${q.selectedOption || ''} ${q.customAnswer ? `(自定义: ${q.customAnswer})` : ''}\n`;
        });
      }
      
      if (relevantSuggestions.length > 0) {
        logEntry += `[采纳优化建议]:\n`;
        relevantSuggestions.forEach(s => {
          const cleanText = s.text.replace(/^建议/, '');
          logEntry += `  - ${cleanText} (来自 ${s.agent})\n`;
        });
      } else {
        logEntry += `[优化建议]: 未采纳任何建议 (忽略)\n`;
      }

      const updatedNoteA = history.present.noteA + logEntry;

      // 2. Call AI Service (Multi-Agent Workflow)
      const result = await runMultiAgentWorkflow(settings, updatedNoteA, history.present.noteB);

      // 3. Update State
      pushHistory({
        ...history.present,
        mindMap: result.mindMap,
        noteA: updatedNoteA,
        noteB: result.noteB
      });

      // 4. Update UI context with NEW questions/suggestions/criticisms from AI
      setActiveQueries(result.deepQueries || []);
      setActiveSuggestions(result.suggestions || []);
      setActiveCriticisms(result.criticisms || []);
      setUserInstruction(''); // Clear instruction input

    } catch (error) {
      alert("AI 智能体执行失败: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFinalPrompt = async () => {
    setIsLoading(true);
    try {
      const prompt = await generatePromptForAIStudio(settings, history.present.noteB);
      setGeneratedPrompt(prompt);
    } catch (error) {
      alert("生成提示词失败。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 font-sans text-gray-800 relative">
      
      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] flex items-center justify-center cursor-wait animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4 border border-gray-100">
             <div className="relative">
               <div className="animate-spin h-14 w-14 border-[5px] border-indigo-100 border-t-indigo-600 rounded-full"/>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Cpu className="w-6 h-6 text-indigo-600 animate-pulse" />
               </div>
             </div>
             <div className="text-center space-y-2">
               <h3 className="text-lg font-bold text-gray-800">
                  {generatedPrompt ? '智能体 E 正在生成提示词...' : '智能体团队正在协作...'}
               </h3>
               <p className="text-sm text-gray-500">
                 {generatedPrompt ? '正在整理 Note B 规格说明书' : '分析指令 · 更新思维导图 · 生成建议 · 毒舌挑刺'}
               </p>
             </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-xl tracking-tight">
            <Cpu className="text-indigo-600" />
            <span>AI 架构师工作室</span>
          </div>
          <div className="h-6 w-px bg-gray-200 mx-4"></div>
          <div className="flex gap-1">
            <button onClick={handleNewProject} disabled={isLoading} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors disabled:opacity-50" title="新建"><Plus size={20}/></button>
            <button onClick={handleSaveProject} disabled={isLoading} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors disabled:opacity-50" title="保存"><Save size={20}/></button>
            <label className={`p-2 hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer transition-colors ${isLoading ? 'opacity-50 pointer-events-none' : ''}`} title="打开">
              <FolderOpen size={20}/>
              <input type="file" className="hidden" accept=".json" onChange={handleLoadProject} disabled={isLoading}/>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-2">
             <button 
               onClick={handleUndo} 
               disabled={history.past.length === 0 || isLoading} 
               className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 text-gray-600"
               title="撤销"
             >
               <Undo size={20}/>
             </button>
             <button 
               onClick={handleRedo} 
               disabled={history.future.length === 0 || isLoading} 
               className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 text-gray-600"
               title="重做"
             >
               <Redo size={20}/>
             </button>
          </div>
          
          <button 
            onClick={() => setShowNotes(true)}
            disabled={isLoading}
            className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all hover:shadow-md disabled:opacity-50"
          >
            <FileText size={18} className="text-orange-500"/>
            查看笔记 (A/B)
          </button>

          <button 
             onClick={handleGenerateFinalPrompt}
             disabled={isLoading}
             className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
           >
             <Code size={18} />
             生成 AI Studio 提示词
           </button>
           
           <button 
             onClick={() => setShowSettings(true)} 
             disabled={isLoading}
             className="p-2 hover:bg-gray-100 rounded-full text-gray-600 disabled:opacity-50"
           >
             <Settings size={20}/>
           </button>
        </div>
      </header>

      {/* Main Layout: 3 Columns */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Column 1 (Left): Deep Queries Panel (Split Product/Programmer) */}
        <div className="w-[320px] shrink-0 z-20 h-full">
           <DeepQueryPanel 
             queries={activeQueries}
             onQueryChange={handleQueryChange}
             isLoading={isLoading}
           />
        </div>

        {/* Column 2 (Center): Mind Map Workspace */}
        <div className="flex-1 relative bg-slate-50 border-l border-r border-gray-200">
           <MindMap 
             data={history.present.mindMap} 
             onUpdate={(newMap) => {
               setHistory(prev => ({...prev, present: { ...prev.present, mindMap: newMap }}));
             }} 
           />
           <div className="absolute top-4 left-4 bg-white/80 backdrop-blur p-3 rounded-lg shadow-sm text-xs text-gray-500 max-w-xs pointer-events-none select-none">
             <h4 className="font-bold text-gray-700 mb-1">智能体 C (绘图师)</h4>
             <p>思维导图由 AI 自动生成。点击节点 +/- 可展开查看。</p>
           </div>

           {/* Agent F Bubbles */}
           <CriticismBubbles 
              criticisms={activeCriticisms} 
              onClose={handleDismissCriticism} 
           />
        </div>

        {/* Column 3 (Right): Instructions & Suggestions & Submit */}
        <div className="w-[320px] shrink-0 z-20 h-full">
          <InteractionPanel 
            instruction={userInstruction}
            onInstructionChange={setUserInstruction}
            suggestions={activeSuggestions}
            onSuggestionToggle={handleSuggestionToggle}
            onAcceptAllSuggestions={handleAcceptAllSuggestions}
            onSubmit={handleCombinedSubmit}
            isLoading={isLoading}
          />
        </div>

        {/* Overlays */}
        <NoteViewer 
          isOpen={showNotes} 
          onClose={() => setShowNotes(false)}
          noteA={history.present.noteA}
          noteB={history.present.noteB}
        />

        {generatedPrompt && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-10 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-5xl flex flex-col overflow-hidden">
               <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                 <div className="flex items-center gap-3">
                   <div className="bg-green-100 p-2 rounded-lg"><Code className="text-green-600"/></div>
                   <h2 className="text-xl font-bold text-gray-800">智能体 E 生成的构建提示词</h2>
                 </div>
                 <button onClick={() => setGeneratedPrompt(null)} className="text-gray-500 hover:text-red-500 font-bold px-4 py-2 hover:bg-red-50 rounded-lg">关闭</button>
               </div>
               <div className="flex-1 p-8 overflow-auto bg-slate-50">
                 <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed select-all bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                   {generatedPrompt}
                 </pre>
               </div>
               <div className="p-5 border-t bg-gray-50 flex justify-end">
                 <button 
                   onClick={handleCopyPrompt}
                   className={`
                     px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2
                     ${copySuccess 
                       ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-200' 
                       : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl shadow-indigo-200'}
                   `}
                 >
                   {copySuccess ? (
                     <>
                       <Check size={20} />
                       已复制全部！
                     </>
                   ) : (
                     <>
                       <Copy size={20} />
                       复制全部内容
                     </>
                   )}
                 </button>
               </div>
            </div>
          </div>
        )}

      </main>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={setSettings}
      />
    </div>
  );
}
