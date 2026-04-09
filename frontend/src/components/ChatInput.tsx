import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { translations } from "@/utils/translations";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  language: string;
}

const ChatInput = ({ onSend, disabled, language }: Props) => {
  const [value, setValue] = useState("");
  const t = translations[language] || translations.en;

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={t.placeholder}
          disabled={disabled}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={disabled || !value.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
