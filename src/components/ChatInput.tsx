import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [inputMessage, setInputMessage] = useState('');

  const handleSend = () => {
    if (!inputMessage.trim() || disabled) return;
    onSendMessage(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-border/20">
      <div className="flex space-x-2">
        <Input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Escribe tu mensaje..."
          disabled={disabled}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={!inputMessage.trim() || disabled}
          size="icon"
          className="h-10 w-10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}