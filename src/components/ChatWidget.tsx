import React, { useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { StorageService } from '@/lib/storage';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatWidgetProps {
  webhookUrl: string;
}

export function ChatWidget({ webhookUrl }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: '¡Hola! Soy tu asistente de SSI Wallet. ¿En qué puedo ayudarte hoy?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getAppContext = async () => {
    try {
      const currentPath = window.location.pathname;
      const allDIDs = await StorageService.getAllDIDs();
      const currentDID = await StorageService.getCurrentDID();
      
      return {
        currentPage: currentPath,
        hasWallet: allDIDs.length > 0,
        isWalletUnlocked: currentDID !== null,
        didCount: allDIDs.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting app context:', error);
      return {
        currentPage: window.location.pathname,
        hasWallet: false,
        isWalletUnlocked: false,
        didCount: 0,
        timestamp: new Date().toISOString(),
      };
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const appContext = await getAppContext();
      
      const payload = {
        message: inputMessage,
        context: appContext,
        chatHistory: messages.slice(-5), // Send last 5 messages for context
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const responseData = await response.json();
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: responseData.response || 'Mensaje recibido, te responderé pronto.',
          isUser: false,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Lo siento, hay un problema técnico. Por favor intenta de nuevo más tarde.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje. Verifica tu conexión.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      message.isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'glass-subtle text-foreground'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="glass-subtle px-3 py-2 rounded-lg flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Escribiendo...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border/20">
            <div className="flex space-x-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="icon"
                className="h-10 w-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}