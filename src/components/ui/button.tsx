import * as React from 'react';

export function Button({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
}
