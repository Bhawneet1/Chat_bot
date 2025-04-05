"use client";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Paperclip, X } from "lucide-react";

interface Message {
  id: number;
  sender: "user" | "bot";
  content: string;
}

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDSW6gwqANHN3-bD_UquBThisLhxWPswFM`; // Replace with your API key

export default function ChatbotUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfText, setPdfText] = useState("");
  const [fileUploaded, setFileUploaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      // @ts-ignore
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const formatMessagesForGemini = (history: Message[]) => {
    return history.map((msg) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));
  };

  const getBotReply = async (updatedMessages: Message[]): Promise<string> => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: formatMessagesForGemini(updatedMessages),
          generationConfig: { responseMimeType: "text/plain" },
        }),
      });

      const data = await response.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "I'm not sure how to respond to that.";
    } catch (error) {
      console.error("Error getting bot reply:", error);
      return "Oops! Something went wrong.";
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessageOnly: Message = {
      id: Date.now(),
      sender: "user",
      content: input.trim(),
    };

    const combinedMessage: Message = {
      ...userMessageOnly,
      content: `${input.trim()}\n\n${pdfText}`,
    };

    const updatedMessages = [...messages, userMessageOnly];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const botReplyText = await getBotReply([...messages, combinedMessage]);

    const botMessage: Message = {
      id: Date.now() + 1,
      sender: "bot",
      content: botReplyText,
    };

    setMessages((prev) => [...prev, botMessage]);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !window || !("pdfjsLib" in window)) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const typedArray = new Uint8Array(reader.result as ArrayBuffer);
      try {
        // @ts-ignore
        const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str).join(" ");
          text += `\nPage ${i}:\n${strings}\n`;
        }
        setPdfText(text);
        console.log("📄 Parsed PDF Content:", text);
        setFileUploaded(true);
      } catch (err) {
        console.error("PDF parsing error:", err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRemoveFile = () => {
    setPdfText("");
    setFileUploaded(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2 text-center">My Chatbot</h1>

      <Card className="flex flex-col flex-grow overflow-hidden">
        <ScrollArea className="flex-grow p-4 space-y-4 overflow-y-auto">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 max-w-xs rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.sender === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="p-3 max-w-xs rounded-2xl text-sm bg-gray-200 text-gray-800 animate-pulse">
                Typing...
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>

        <CardContent className="border-t p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            <input
              type="file"
              accept=".pdf"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            {fileUploaded && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <span>📎 1 file uploaded</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleRemoveFile}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1"
              disabled={loading}
            />
            <Button onClick={handleSend} disabled={loading}>
              {loading ? "..." : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
