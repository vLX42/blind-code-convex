import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export const Button = ({ children, className = "", disabled, ...props }: ButtonProps) => (
  <button
    className={`px-4 py-2 bg-green-600 hover:bg-green-500 rounded font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
);


