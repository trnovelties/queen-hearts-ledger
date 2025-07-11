
import React from "react";

interface AdminViewIconProps {
  className?: string;
}

export const AdminViewIcon: React.FC<AdminViewIconProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 256 256" 
      className={className}
      fill="none"
    >
      <circle cx="200" cy="56" r="16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
      <line x1="200" y1="40" x2="200" y2="28" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
      <line x1="186.14" y1="48" x2="175.75" y2="42" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
      <line x1="186.14" y1="64" x2="175.75" y2="70" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
      <line x1="200" y1="72" x2="200" y2="84" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
      <line x1="213.86" y1="64" x2="224.25" y2="70" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
      <line x1="213.86" y1="48" x2="224.25" y2="42" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
      <circle cx="128" cy="120" r="40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
      <path d="M63.8,199.37a72,72,0,0,1,128.4,0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
      <path d="M222.67,112A95.92,95.92,0,1,1,144,33.33" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    </svg>
  );
};
