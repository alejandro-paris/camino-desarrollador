import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'success';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  let colorClass = 'border-[#00FFFF] text-[#00FFFF] hover:bg-[#00FFFF] hover:text-black';
  if (variant === 'danger') colorClass = 'border-[#FF3333] text-[#FF3333] hover:bg-[#FF3333] hover:text-black';
  if (variant === 'success') colorClass = 'border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14] hover:text-black';

  return (
    <button
      className={`px-6 py-3 font-mono font-bold text-lg border-2 border-b-4 active:border-b-2 active:translate-y-1 transition-all uppercase tracking-wider ${colorClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};