import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ChatWidget } from "@/components/ChatWidget";
import Index from "./pages/Index";
import Credentials from "./pages/Credentials";
import Exchange from "./pages/Exchange";
import Issue from "./pages/Issue";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/credentials" element={<Credentials />} />
          <Route path="/exchange" element={<Exchange />} />
          <Route path="/issue" element={<Issue />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ChatWidget webhookUrl="https://shakams434.app.n8n.cloud/webhook-test/9c97ec55-93e7-4d52-9f4f-3e6263b46937" />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
