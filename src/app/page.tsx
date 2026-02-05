"use client";

import { useState } from "react";
import { WelcomeScreen } from "../components/WelcomeScreen";
import { ChatInterface } from "../components/ChatInterface";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  context?: string[];
  timestamp: Date;
}

export default function Home() {
  const [hasDocument, setHasDocument] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDocumentUpload = async (fileName: string) => {
    setHasDocument(true);
    setMessages([]);
  };

  const handleSendMessage = async (content: string, persona: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: content,
          persona,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        context: data.context,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasDocument) {
    return (
      <WelcomeScreen
        onDocumentUpload={handleDocumentUpload}
        onError={setError}
      />
    );
  }

  return (
    <ChatInterface
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      messages={messages}
      hasDocument={hasDocument}
    />
  );
}
