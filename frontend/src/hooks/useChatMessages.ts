import { useState, useCallback, useEffect } from "react";
import { translations } from "@/utils/translations";

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
  isTranslating?: boolean;
}

export function useChatMessages() {
  const [language, setLanguage] = useState("en");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      content: translations.en.welcome,
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Update welcome message and retranslate history when language changes
  useEffect(() => {
    // 1. Update the welcome message first (instant from dictionary)
    setMessages((prev) => 
      prev.map((msg) => 
        msg.id === "welcome" 
          ? { ...msg, content: (translations[language] || translations.en).welcome }
          : msg
      )
    );

    // 2. Retranslate the rest of the history (async from API)
    const retranslateHistory = async () => {
      const messagesToTranslate = messages.filter(m => m.id !== "welcome");
      if (messagesToTranslate.length === 0) return;

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      // Set all to isTranslating first
      setMessages((prev) => 
        prev.map((p) => p.id !== "welcome" ? { ...p, isTranslating: true } : p)
      );

      // Map through messages and update them one by one
      for (const msg of messagesToTranslate) {
        try {
          const res = await fetch(`${API_BASE_URL}/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: msg.content, target_lang: language }),
          });
          if (res.ok) {
            const data = await res.json();
            setMessages((prev) => 
              prev.map((p) => p.id === msg.id ? { ...p, content: data.translated_text, isTranslating: false } : p)
            );
          }
        } catch (error) {
          console.error("Retranslation error:", error);
          setMessages((prev) => 
            prev.map((p) => p.id === msg.id ? { ...p, isTranslating: false } : p)
          );
        }
      }
    };

    retranslateHistory();
  }, [language]);

  const sendMessage = useCallback(
    async (content: string) => {
      const safeId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      const userMsg: ChatMessage = {
        id: safeId(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      const t = translations[language] || translations.en;
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      try {
        const res = await fetch(`${API_BASE_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, language }),
        });

        if (!res.ok) throw new Error("API error");

        const data = await res.json();
        const botMsg: ChatMessage = {
          id: safeId(),
          role: "bot",
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch {
        // Fallback response in the correct language
        await new Promise((r) => setTimeout(r, 1000));
        const botMsg: ChatMessage = {
          id: safeId(),
          role: "bot",
          content: t.welcome, // Using welcome as a fallback if API is down
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [language]
  );

  const clearChat = useCallback(() => {
    const t = translations[language] || translations.en;
    setMessages([
      {
        id: "welcome",
        role: "bot",
        content: t.welcome,
        timestamp: new Date(),
      },
    ]);
  }, [language]);

  return { messages, language, setLanguage, sendMessage, clearChat, isTyping };
}
