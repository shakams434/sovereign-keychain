import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/useChat';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { TypingIndicator } from '@/components/TypingIndicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatWidgetProps {
  webhookUrl: string;
}

export function ChatWidget({ webhookUrl }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isLoading, sendMessage, clearMessages } = useChat({ webhookUrl });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = (messageContent: string) => {
    sendMessage(messageContent);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg transition-all duration-300 z-50 ${
          isOpen 
            ? 'bg-destructive hover:bg-destructive/90' 
            : 'bg-primary hover:bg-primary/90 glow-primary'
        }`}
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 h-96 glass-card rounded-lg shadow-xl z-40 flex flex-col transition-smooth">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/20">
            <div>
              <h3 className="font-semibold text-foreground">SSI Wallet Support</h3>
              <p className="text-xs text-muted-foreground">Asistente virtual</p>
            </div>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={clearMessages}>
                    Limpiar chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
      )}
    </>
  );
}