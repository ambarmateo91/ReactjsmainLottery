import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';

export function Toaster() {
  const { toasts } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={`rounded-md border p-4 shadow-lg ${
          toast.variant === 'destructive' ? 'bg-destructive text-destructive-foreground' :
          toast.variant === 'success' ? 'bg-green-600 text-white' :
          'bg-background'
        }`}>
          <p className="font-medium">{toast.title}</p>
          {toast.description && <p className="text-sm">{toast.description}</p>}
        </div>
      ))}
    </div>
  );
}
