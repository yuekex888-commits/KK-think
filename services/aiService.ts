
import { AIAnalysisResult, AISettings, DeepQuery, Suggestion, MindMapNode, Criticism } from '../types';

// Helper to sanitize JSON with robust fallback
const extractJSON = (text: string): any => {
  const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdownMatch) {
    try { return JSON.parse(markdownMatch[1]); } catch (e) { /* ignore */ }
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.substring(start, end + 1)); } catch (e) { /* ignore */ }
  }
  throw new Error(`No JSON found in response.`);
};

// Generic API Caller
const callAI = async (settings: AISettings, systemPrompt: string, userContent: string, jsonMode: boolean = false): Promise<string> => {
  const payload = {
    model: settings.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ],
    temperature: 0.7,
    max_tokens: 8000, 
  };

  try {
    const response = await fetch(settings.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) throw new Error("API returned empty content");
    return content;
  } catch (error) {
    console.error("AI Request Failed", error);
    throw error;
  }
};

// --- Individual Agent Functions ---

// Agent D: Summarizer
const runAgentSummarizer = async (settings: AISettings, noteA: string, currentNoteB: string): Promise<string> => {
  const prompt = `
    你现在是 **智能体 D (总结师)**。
    
    【任务】
    读取 [Note A (交互日志)] 和 [Note B (旧规格书)]。
    将 Note A 中用户的新增指令、回答和采纳建议，整合进 Note B。
    
    【原则】
    1. Note B 是项目的唯一真理来源。必须包含所有细节。
    2. 只能增加或修改细节，**绝对不要删除**旧的已确认细节，除非用户明确要求删除。
    3. 输出必须是纯粹的 Markdown 格式文档。
    4. **只返回 Note B 的内容**，不要包含任何前言或后语。
  `;

  const input = `
    *** [Note A (交互日志)] ***
    ${noteA}

    *** [Note B (旧规格书)] ***
    ${currentNoteB}
  `;

  return await callAI(settings, settings.agentPrompts.summarizer + prompt, input);
};

// Agent C: Mapper
const runAgentMapper = async (settings: AISettings, noteB: string): Promise<MindMapNode> => {
  const prompt = `
    你现在是 **智能体 C (绘图师)**。
    
    【任务】
    根据 [Note B (规格书)]，生成完整的思维导图结构。
    
    【要求】
    1. 返回单一 JSON 对象，符合 MindMapNode 接口: { id: string, text: string, detail: string, children: [] }。
    2. 根节点 ID 必须为 "root"。
    3. 每个节点必须有 'detail' 字段，简要描述该功能点。
    4. 结构要深，逻辑要严密。
    5. **只返回 JSON**。
  `;
  
  const raw = await callAI(settings, settings.agentPrompts.mapper + prompt, `[Note B]:\n${noteB}`, true);
  return extractJSON(raw);
};

// Agent A: Programmer
const runAgentProgrammer = async (settings: AISettings, noteB: string): Promise<{queries: DeepQuery[], suggestions: Suggestion[]}> => {
  const prompt = `
    你现在是 **智能体 A (程序猿)**。
    
    【任务】
    审查 [Note B (规格书)]，从技术实现、数据结构、逻辑漏洞角度进行分析。
    
    【输出】
    返回 JSON:
    {
      "queries": [ { "question": "...", "options": ["A...", "B..."], "allowCustom": true } ], // 最多 8 个
      "suggestions": [ { "text": "..." } ] // 最多 5 个
    }
    **只返回 JSON**。
  `;
  
  const raw = await callAI(settings, settings.agentPrompts.programmer + prompt, `[Note B]:\n${noteB}`, true);
  const json = extractJSON(raw);
  
  // Tag results
  const queries = (json.queries || []).map((q: any, i: number) => ({
    id: `prog_q_${Date.now()}_${i}`,
    agent: 'Programmer',
    question: q.question,
    options: q.options || [],
    allowCustom: q.allowCustom ?? true,
    selectedOption: '',
    customAnswer: ''
  }));

  const suggestions = (json.suggestions || []).map((s: any, i: number) => ({
    id: `prog_s_${Date.now()}_${i}`,
    agent: 'Programmer',
    text: s.text,
    accepted: false
  }));

  return { queries, suggestions };
};

// Agent B: Product Manager
const runAgentProduct = async (settings: AISettings, noteB: string): Promise<{queries: DeepQuery[], suggestions: Suggestion[]}> => {
  const prompt = `
    你现在是 **智能体 B (产品师)**。
    
    【任务】
    审查 [Note B (规格书)]，从用户体验 (UX)、业务流程、实用性、遗漏功能角度进行分析。
    
    【输出】
    返回 JSON:
    {
      "queries": [ { "question": "...", "options": ["A...", "B..."], "allowCustom": true } ], // 最多 8 个
      "suggestions": [ { "text": "..." } ] // 至少提供 2-5 条建议
    }
    **只返回 JSON**。
  `;
  
  const raw = await callAI(settings, settings.agentPrompts.product + prompt, `[Note B]:\n${noteB}`, true);
  const json = extractJSON(raw);
  
  // Tag results
  const queries = (json.queries || []).map((q: any, i: number) => ({
    id: `prod_q_${Date.now()}_${i}`,
    agent: 'Product',
    question: q.question,
    options: q.options || [],
    allowCustom: q.allowCustom ?? true,
    selectedOption: '',
    customAnswer: ''
  }));

  const suggestions = (json.suggestions || []).map((s: any, i: number) => ({
    id: `prod_s_${Date.now()}_${i}`,
    agent: 'Product',
    text: s.text,
    accepted: false
  }));

  return { queries, suggestions };
};

// Agent F: Critic (Nitpicker)
const runAgentCritic = async (settings: AISettings, noteA: string, noteB: string): Promise<Criticism[]> => {
  const prompt = `
    你现在是 **智能体 F (挑刺师)**。
    
    【任务】
    阅读 [Note A (交互历史)] 和 [Note B (当前规格)]。
    针对当前的设计方案，找出 5 个具体的【UI/UX 问题】、【动效缺失】或【功能不合理】的地方。
    
    【原则】
    1. **绝对禁止攻击其他智能体**。只针对软件设计本身。
    2. 评价必须符合真实软件开发逻辑，不要胡编乱造。
    3. 语气尖锐、讽刺、直接、不留情面，像一个眼光极高的资深设计师用户。
    
    【输出】
    返回 JSON:
    {
      "criticisms": [ "这UI配色简直是...", "这里为什么没有过渡动效？", ... ] // 必须正好 5 条
    }
    **只返回 JSON**。
  `;

  const input = `
    [Note A]: ${noteA}
    [Note B]: ${noteB}
  `;

  try {
    const raw = await callAI(settings, settings.agentPrompts.critic + prompt, input, true);
    const json = extractJSON(raw);
    return (json.criticisms || []).map((text: string, i: number) => ({
      id: `critic_${Date.now()}_${i}`,
      text
    }));
  } catch (e) {
    console.error("Agent F failed", e);
    return [{ id: 'err', text: '智能体 F 正在休息，暂时没空挑刺。' }];
  }
};


// --- Coordinator ---

export const runMultiAgentWorkflow = async (
  settings: AISettings,
  currentNoteA: string,
  currentNoteB: string
): Promise<AIAnalysisResult> => {
  
  // Step 1: Summarize (Serial)
  console.log("Starting Agent D (Summarizer)...");
  let newNoteB = "";
  try {
    newNoteB = await runAgentSummarizer(settings, currentNoteA, currentNoteB);
  } catch (e) {
    console.error("Agent D Failed", e);
    throw new Error("智能体 D (总结师) 运行失败，无法更新规格书。请重试。");
  }

  // Step 2: Concurrent Tasks (Mapper, Programmer, Product, Critic)
  console.log("Starting Agents A, B, C, F (Concurrent)...");
  
  const [mapResult, progResult, prodResult, criticResult] = await Promise.all([
    runAgentMapper(settings, newNoteB),
    runAgentProgrammer(settings, newNoteB),
    runAgentProduct(settings, newNoteB),
    runAgentCritic(settings, currentNoteA, newNoteB) // Feed both for better context
  ]);

  return {
    mindMap: mapResult,
    noteB: newNoteB,
    deepQueries: [...progResult.queries, ...prodResult.queries],
    suggestions: [...progResult.suggestions, ...prodResult.suggestions],
    criticisms: criticResult
  };
};

export const generatePromptForAIStudio = async (
  settings: AISettings,
  noteB: string
): Promise<string> => {
  const prompt = `
    你现在是 **智能体 E (提示词工程师)**。
    【任务】
    根据 [Note B]，编写一套完备的 Google AI Studio Build Prompt。
    要求结构清晰，包含角色、步骤、详细需求。
    直接输出内容。
  `;
  const result = await callAI(settings, settings.agentPrompts.promptEngineer + prompt, `[Note B]:\n${noteB}`);
  return `${noteB}\n\n========================================\nAI STUDIO BUILD PROMPT\n========================================\n\n${result}`;
};
