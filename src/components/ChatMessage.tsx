import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChatMessage as ChatMessageType } from '@/hooks/useChat';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
          message.isUser
            ? 'bg-primary text-primary-foreground'
            : 'glass-subtle text-foreground'
        }`}
      >
        <div className="mb-1">{message.content}</div>
        <div className={`text-xs opacity-70 ${
          message.isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
        }`}>
          {formatDistanceToNow(message.timestamp, { 
            addSuffix: true, 
            locale: es 
          })}
        </div>
      </div>
    </div>
  );
}