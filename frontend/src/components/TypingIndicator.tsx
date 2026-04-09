const TypingIndicator = () => (
  <div className="flex items-start gap-2 px-4">
    <div className="bg-chat-bot text-chat-bot-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1">Bot is typing</span>
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground inline-block" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground inline-block" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground inline-block" />
      </div>
    </div>
  </div>
);

export default TypingIndicator;
