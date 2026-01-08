import React from 'react';

interface Props {
  content: string;
  onChange: (s: string) => void;
}

export const Notepad: React.FC<Props> = ({ content, onChange }) => {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-3 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600">
        项目记事本 (核心内容)
      </div>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 w-full p-4 resize-none outline-none text-sm font-mono leading-relaxed text-gray-800"
        placeholder="# 在此记录软件详细需求..."
      />
    </div>
  );
};