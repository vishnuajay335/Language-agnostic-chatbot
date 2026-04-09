import { ChatMessage } from "@/hooks/useChatMessages";
import { format } from "date-fns";
import { Bot, User, RefreshCcw } from "lucide-react";

interface Props {
  message: ChatMessage;
}

const MessageBubble = ({ message }: Props) => {
  const isUser = message.role === "user";
  const isTranslating = message.isTranslating;

  return (
    <div className={`flex items-end gap-2 px-4 transition-all duration-300 ${isUser ? "flex-row-reverse" : ""} ${isTranslating ? "scale-[0.98] opacity-70" : "scale-100 opacity-100"}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex max-w-[75%] flex-col gap-1">
        <div
          className={`relative rounded-2xl px-4 py-2.5 shadow-sm ${
            isUser
              ? "bg-chat-user text-chat-user-foreground rounded-tr-sm"
              : "bg-chat-bot text-chat-bot-foreground rounded-tl-sm"
          }`}
        >
          {isTranslating && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[1px] rounded-2xl">
              <RefreshCcw className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className={`flex items-center gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
          <span className="text-[10px] text-muted-foreground">
            {format(message.timestamp, "h:mm a")}
          </span>
          {isTranslating && <span className="text-[10px] italic text-muted-foreground animate-pulse">Translating...</span>}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
