import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { MindMapNode } from '../types';
import { ZoomIn, ZoomOut, Move, Type } from 'lucide-react';

interface Props {
  data: MindMapNode;
  onUpdate: (newData: MindMapNode) => void;
}

// Editable Node Component
const NodeItem: React.FC<{
  node: MindMapNode;
  depth: number;
  onUpdate: (n: MindMapNode) => void;
  parentId?: string;
}> = ({ node, depth, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(node.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalText(node.text);
  }, [node.text]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Auto-resize height
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localText !== node.text) {
      onUpdate({ ...node, text: localText });
    }
  };

  const updateChild = (index: number, newChild: MindMapNode) => {
    const newChildren = [...node.children];
    newChildren[index] = newChild;
    onUpdate({ ...node, children: newChildren });
  };

  return (
    <div className="flex flex-row items-center relative py-2">
      
      {/* Node Content */}
      <div 
        id={`node-${node.id}`}
        className={`
          relative z-20 flex flex-col justify-center group transition-shadow duration-200
          ${depth === 0 ? 'bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-50' : 'bg-white text-gray-800 border border-gray-200 shadow-sm hover:border-indigo-400 hover:shadow-md'}
          rounded-lg
          min-w-[120px] max-w-[280px]
          shrink-0
        `}
      >
        <div 
          className="px-4 py-3 w-full cursor-text"
          onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
        >
          {isEditing ? (
            <textarea
              ref={inputRef}
              value={localText}
              onChange={(e) => {
                setLocalText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleBlur();
                }
              }}
              className="w-full bg-transparent outline-none resize-none overflow-hidden text-sm font-bold leading-snug"
              rows={1}
            />
          ) : (
            <>
              <div className="font-bold text-sm leading-snug select-none">{node.text}</div>
              {node.detail && (
                <div className={`text-[10px] mt-1 leading-tight ${depth === 0 ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {node.detail}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Children Container (Recursive) - ALWAYS RENDERED (No Collapse) */}
      {node.children && node.children.length > 0 && (
        <div className="flex flex-row items-center">
          {/* Connector Line Space */}
          <div className="w-12 h-px border-t-2 border-transparent shrink-0" />
          
          {/* Vertical list of children */}
          <div className="flex flex-col gap-6 pl-2 border-l-0 border-gray-200"> 
            {/* gap-6 ensures no overlapping vertical stacking */}
            {node.children.map((child, idx) => (
              <NodeItem 
                key={child.id} 
                node={child} 
                depth={depth + 1} 
                onUpdate={(n) => updateChild(idx, n)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const MindMap: React.FC<Props> = ({ data, onUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 50, y: 50 }); // Start with some padding
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [svgPaths, setSvgPaths] = useState<React.ReactNode[]>([]);

  // Robust Line Drawing Function
  const drawLines = useCallback(() => {
    if (!contentRef.current) return;
    
    // We calculate everything relative to the content container (the scaled element)
    // getBoundingClientRect returns viewport coords, so we adjust.
    const containerRect = contentRef.current.getBoundingClientRect();
    const newPaths: React.ReactNode[] = [];

    const traverse = (node: MindMapNode) => {
      const parentEl = document.getElementById(`node-${node.id}`);
      if (!parentEl) return;
      const parentRect = parentEl.getBoundingClientRect();

      // Calculate Parent Anchor Point (Right Center) relative to Container, unscaled
      const pX = (parentRect.right - containerRect.left) / scale;
      const pY = (parentRect.top + parentRect.height / 2 - containerRect.top) / scale;

      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          const childEl = document.getElementById(`node-${child.id}`);
          if (childEl) {
            const childRect = childEl.getBoundingClientRect();
            
            // Calculate Child Anchor Point (Left Center)
            const cX = (childRect.left - containerRect.left) / scale;
            const cY = (childRect.top + childRect.height / 2 - containerRect.top) / scale;

            // Bezier Curve Logic
            // Control points: halfway between parent and child horizontally
            const deltaX = cX - pX;
            // Ensure visible curve even if close
            const controlDist = Math.max(deltaX * 0.5, 20); 

            const path = `
              M ${pX} ${pY} 
              C ${pX + controlDist} ${pY}, 
                ${cX - controlDist} ${cY}, 
                ${cX} ${cY}
            `;
            
            newPaths.push(
              <path 
                key={`${node.id}-${child.id}`} 
                d={path} 
                stroke="#cbd5e1" // slate-300
                strokeWidth="2" 
                fill="none" 
              />
            );
          }
          traverse(child);
        });
      }
    };

    traverse(data);
    setSvgPaths(newPaths);
  }, [data, scale]);

  // Observer Effect: Handles Resize (Window/Panel) and Mutation (DOM growth)
  useEffect(() => {
    if (!contentRef.current || !containerRef.current) return;

    // 1. Initial draw
    requestAnimationFrame(drawLines);

    // 2. Watch for container resize (e.g. sidebar open/close)
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(drawLines);
    });
    resizeObserver.observe(containerRef.current);
    resizeObserver.observe(contentRef.current);

    // 3. Watch for DOM content changes (e.g. text editing, expanding nodes)
    const mutationObserver = new MutationObserver(() => {
       requestAnimationFrame(drawLines);
    });
    mutationObserver.observe(contentRef.current, { 
      childList: true, 
      subtree: true, 
      attributes: true,
      characterData: true 
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [drawLines]);

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom logic
    if (e.ctrlKey || e.metaKey || true) { // Always zoom on scroll for canvas feel
      // Prevent default browser zoom if necessary (though usually handled by event)
      const zoomSensitivity = 0.001;
      const newScale = Math.min(Math.max(0.1, scale - e.deltaY * zoomSensitivity), 4);
      setScale(newScale);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if clicking background
    if ((e.target as HTMLElement).closest('.group')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-slate-50 overflow-hidden relative cursor-grab active:cursor-grabbing selection:bg-indigo-100"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Controls Overlay */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-50">
         <div className="bg-white/90 p-2 rounded-lg shadow-md flex flex-col gap-2 backdrop-blur-sm border border-gray-100">
            <button title="Zoom In" className="p-2 hover:bg-gray-100 rounded text-gray-600" onClick={() => setScale(s => Math.min(s + 0.1, 4))}><ZoomIn size={20}/></button>
            <button title="Reset View" className="p-2 hover:bg-gray-100 rounded text-gray-600" onClick={() => { setScale(1); setPosition({x:50, y:50}); }}><Move size={20}/></button>
            <button title="Zoom Out" className="p-2 hover:bg-gray-100 rounded text-gray-600" onClick={() => setScale(s => Math.max(s - 0.1, 0.1))}><ZoomOut size={20}/></button>
         </div>
      </div>

      <div className="absolute top-4 left-4 bg-white/60 backdrop-blur px-3 py-1 rounded-full text-[10px] text-gray-500 z-50 pointer-events-none border border-gray-200">
         双击节点编辑文本 · 滚轮缩放 · 拖拽平移
      </div>

      {/* Canvas Content */}
      <div 
        ref={contentRef}
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '0 0'
        }}
        className="absolute top-0 left-0 min-w-full min-h-full origin-top-left"
      >
        {/* SVG Layer for Lines (Z-Index 0) */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-0">
          {svgPaths}
        </svg>

        {/* Node Tree Layer (Z-Index 10+) */}
        <div className="inline-block p-10"> {/* Add padding to allow dragging near edges */}
          <NodeItem node={data} depth={0} onUpdate={onUpdate} />
        </div>
      </div>
    </div>
  );
};
