"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { PersonaType, PERSONA_PROMPTS } from "@/lib/prompts";

interface ChatInterfaceProps {
  onSendMessage: (message: string, persona: string) => void;
  isLoading: boolean;
  messages: any[];
  hasDocument: boolean;
}

export function ChatInterface({
  onSendMessage,
  isLoading,
  messages,
  hasDocument,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [selectedPersona, setSelectedPersona] =
    useState<PersonaType>("default");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const personas: Array<{ value: PersonaType; label: string; icon: string }> = [
    { value: "default", label: "General", icon: "💡" },
    { value: "lawyer", label: "Legal Expert", icon: "⚖️" },
    { value: "teacher", label: "Educator", icon: "🎓" },
  ];

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message, selectedPersona);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show persona selection when no messages yet
  if (messages.length === 0 && hasDocument) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-b from-gray-900 via-gray-900 to-black px-4 pb-8">
        <div className="w-full max-w-2xl space-y-12">
          {/* Welcome */}
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-bold text-white">Ready to chat?</h2>
            <p className="text-lg text-gray-400">
              Choose how you'd like assistance
            </p>
          </div>

          {/* Persona Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {personas.map((persona) => (
              <button
                key={persona.value}
                onClick={() => setSelectedPersona(persona.value)}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  selectedPersona === persona.value
                    ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                    : "border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800"
                }`}
              >
                <div className="text-3xl mb-2">{persona.icon}</div>
                <h3 className="text-white font-semibold mb-1">
                  {persona.label}
                </h3>
                <p className="text-gray-400 text-sm">
                  {persona.value === "default"
                    ? "General assistance"
                    : persona.value === "lawyer"
                      ? "Legal analysis"
                      : "Teaching style"}
                </p>
              </button>
            ))}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-3 items-end bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-700 focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-500/20 transition-all">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your document..."
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none outline-none bg-transparent text-white placeholder-gray-500 scrollbar-hide"
              />
              <button
                type="submit"
                disabled={isLoading || !message.trim()}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-screen bg-linear-to-b from-gray-900 via-gray-900 to-black">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Start the conversation above</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xl rounded-lg px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-gray-800 text-gray-100 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  {msg.context && msg.context.length > 0 && (
                    <details className="mt-2 text-xs opacity-75">
                      <summary className="cursor-pointer hover:opacity-100">
                        📄 Sources ({msg.context.length})
                      </summary>
                      <div className="mt-2 space-y-1 bg-black/30 p-2 rounded">
                        {msg.context.map((ctx: string, idx: number) => (
                          <div key={idx} className="text-xs opacity-75">
                            {ctx.substring(0, 100)}...
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-lg px-4 py-3 rounded-bl-none">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Footer */}
      <div className="border-t border-gray-800 bg-linear-to-t from-gray-900 to-gray-900/50 p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="space-y-3">
            {/* Persona Pills */}
            <div className="flex gap-2 flex-wrap">
              {personas.map((persona) => (
                <button
                  key={persona.value}
                  type="button"
                  onClick={() => setSelectedPersona(persona.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedPersona === persona.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {persona.icon} {persona.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-3 items-end bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-700 focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-500/20 transition-all">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask something about your document..."
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none outline-none bg-transparent text-white placeholder-gray-500 scrollbar-hide"
              />
              <button
                type="submit"
                disabled={isLoading || !message.trim()}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
