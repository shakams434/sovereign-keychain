import React from 'react';
import { Loader2 } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="glass-subtle px-3 py-2 rounded-lg flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Escribiendo...</span>
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse"></div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}