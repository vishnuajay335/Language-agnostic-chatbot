import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ChatWindow from "@/components/ChatWindow";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useTheme } from "@/hooks/useTheme";
import { GraduationCap } from "lucide-react";
import { translations } from "@/utils/translations";

const Index = () => {
  const { messages, language, setLanguage, sendMessage, clearChat, isTyping } = useChatMessages();
  const { isDark, toggleTheme } = useTheme();
  const t = translations[language] || translations.en;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar
          language={language}
          onLanguageChange={setLanguage}
          onQuickAction={sendMessage}
          onClearChat={clearChat}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
        <div className="flex flex-1 flex-col">
          <header className="flex h-12 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <GraduationCap className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-semibold">{t.appName}</h1>
          </header>
          <main className="flex-1 overflow-hidden">
            <ChatWindow messages={messages} isTyping={isTyping} onSend={sendMessage} language={language} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
