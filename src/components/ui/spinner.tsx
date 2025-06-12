import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative">
        <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-primary ${sizeClasses[size]}`} />
      </div>
      {text && <span className="text-sm text-gray-600 dark:text-gray-400">{text}</span>}
    </div>
  );
};
