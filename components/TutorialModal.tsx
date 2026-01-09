import React from 'react';
import { Button } from './Button';
import { COLORS } from '../types';

interface TutorialModalProps {
  title: string;
  content: string;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ title, content, onClose }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-4">
      <div className="bg-black border-2 border-[#39FF14] p-1 max-w-sm w-full shadow-[0_0_20px_rgba(57,255,20,0.3)] animate-pulse-slow">
        {/* Retro Header */}
        <div className="bg-[#39FF14] text-black font-bold px-2 py-1 mb-4 flex justify-between items-center">
          <span>SYSTEM_MSG</span>
          <span className="text-xs">[X]</span>
        </div>
        
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4 text-[#39FF14] font-mono uppercase tracking-widest border-b border-[#39FF14]/30 pb-2">
            {'>'} {title}
            </h2>
            <p className="text-[#39FF14] mb-8 font-mono text-lg leading-relaxed opacity-90">
            {content}
            </p>
            <div className="flex justify-center">
            <Button onClick={onClose} variant="success">ACEPTAR</Button>
            </div>
        </div>
      </div>
    </div>
  );
};