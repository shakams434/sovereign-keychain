import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { StorageService } from '@/lib/storage';

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatContextData {
  currentPage: string;
  hasWallet: boolean;
  isWalletUnlocked: boolean;
  didCount: number;
  timestamp: string;
}

interface UseChatProps {
  webhookUrl: string;
}

export function useChat({ webhookUrl }: UseChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load persisted messages on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('ssi-chat-messages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (error) {
        console.error('Error loading saved messages:', error);
      }
    } else {
      // Set initial welcome message
      setMessages([{
        id: '1',
        content: '¡Hola! Soy tu asistente de SSI Wallet. ¿En qué puedo ayudarte hoy?',
        isUser: false,
        timestamp: new Date(),
      }]);
    }
  }, []);

  // Persist messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ssi-chat-messages', JSON.stringify(messages));
    }
  }, [messages]);

  const getAppContext = async (): Promise<ChatContextData> => {
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

  const sendMessageWithRetry = async (payload: any, retries = 3): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
      try {
        // Send preflight OPTIONS request first
        await fetch(webhookUrl, {
          method: 'OPTIONS',
          headers: {
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type',
          },
        });

        // Send actual POST request
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          return response;
        } else if (response.status >= 500 && i < retries - 1) {
          // Retry on server errors
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          continue;
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      } catch (error) {
        if (i === retries - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('All retries failed');
  };

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: messageContent,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const appContext = await getAppContext();
      
      const payload = {
        message: messageContent,
        context: appContext,
        chatHistory: messages.slice(-5), // Send last 5 messages for context
        timestamp: new Date().toISOString(),
      };

      const response = await sendMessageWithRetry(payload);
      const responseData = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: responseData.response || 'Mensaje recibido, te responderé pronto.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
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

  const clearMessages = () => {
    setMessages([{
      id: '1',
      content: '¡Hola! Soy tu asistente de SSI Wallet. ¿En qué puedo ayudarte hoy?',
      isUser: false,
      timestamp: new Date(),
    }]);
    localStorage.removeItem('ssi-chat-messages');
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}