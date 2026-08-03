/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { UserProfile, ChatMessage } from "../types";
import { Send, Image, MessageSquare, Shield, HelpCircle, FileImage, Loader2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatViewProps {
  userProfile: UserProfile;
  initialRoom?: "shared" | "admin";
}

// Helper to reliably generate distinct pastel colors for usernames
const getNameColor = (name: string) => {
  const colors = [
    "text-sky-400 drop-shadow-[0_1px_2px_rgba(56,189,248,0.15)]",
    "text-emerald-400 drop-shadow-[0_1px_2px_rgba(52,211,153,0.15)]",
    "text-amber-400 drop-shadow-[0_1px_2px_rgba(251,191,36,0.15)]",
    "text-rose-400 drop-shadow-[0_1px_2px_rgba(251,113,133,0.15)]",
    "text-violet-400 drop-shadow-[0_1px_2px_rgba(167,139,250,0.15)]",
    "text-teal-400 drop-shadow-[0_1px_2px_rgba(45,212,191,0.15)]",
    "text-pink-400 drop-shadow-[0_1px_2px_rgba(244,114,182,0.15)]",
    "text-orange-400 drop-shadow-[0_1px_2px_rgba(251,146,60,0.15)]"
  ];
  let hash = 0;
  const cleanName = name || "Miner";
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function ChatView({ userProfile, initialRoom = "shared" }: ChatViewProps) {
  const [activeRoom, setActiveRoom] = useState<"shared" | "admin">("shared");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [base64Image, setBase64Image] = useState<string>("");
  const [imageName, setImageName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const roomId = activeRoom === "shared" ? "shared" : `direct_${userProfile.phone}`;

  // Sync initialRoom when navigation directs to specific room
  useEffect(() => {
    setActiveRoom(initialRoom);
  }, [initialRoom]);

  // Poll for messages
  useEffect(() => {
    let active = true;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat/room/${roomId}`);
        if (res.ok && active) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const list = await res.json();
            setMessages(list);
            setIsLoadingMessages(false);
          }
        }
      } catch (err) {
        console.error("Failed to sync chat room:", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [roomId]);

  // Track scroll position to conditionally show scroll to bottom button
  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBottomBtn(distanceFromBottom > 150);
  };

  // Scroll to bottom immediately on room switch
  useEffect(() => {
    setShowScrollBottomBtn(false);
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);
    return () => clearTimeout(timer);
  }, [roomId]);

  // Handle auto-scroll only when near the bottom or sending a message
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const lastMessage = messages[messages.length - 1];
    const isMyMessage = lastMessage && lastMessage.sender === userProfile.phone;

    if (distanceFromBottom < 150 || isMyMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, userProfile.phone]);

  // File to base64 converter
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image file size limit represents 2MB. Please select a smaller attachment file.");
        return;
      }
      setImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Image(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAttachment = () => {
    setBase64Image("");
    setImageName("");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !base64Image) return;

    setIsSending(true);
    const textToSend = inputText;
    const imageToSend = base64Image;

    // Reset inputs immediately for better UI responsive feel
    setInputText("");
    clearAttachment();

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          sender: userProfile.phone,
          senderName: userProfile.username || "Anonymous Miner",
          text: textToSend,
          image: imageToSend
        })
      });

      if (!res.ok) {
        throw new Error("Could not relay text message.");
      }

      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
    } catch (e) {
      alert("Failed to send message: " + e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden select-none relative p-2 md:p-3">
      
      {/* Main chat terminal view with card preset awareness */}
      <div className="flex-1 flex flex-col justify-between h-full theme-card card-playful-3d bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-[var(--theme-radius)] min-w-0 overflow-hidden relative shadow-md">
        
        {/* Active room header bar - Only centered navigation tabs */}
        <div className="px-4 py-3 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-bg)]/95 backdrop-blur-md flex items-center justify-center shrink-0 z-10">
          {/* Integrated Navigation Tabs inside Header */}
          <div className="flex bg-[var(--theme-bg)]/80 rounded-full p-1 gap-1 border border-[var(--theme-card-border)] w-full max-w-[340px] relative shadow-xs">
            <button
              type="button"
              onClick={() => {
                setActiveRoom("shared");
                setIsLoadingMessages(true);
              }}
              className={`py-2 px-3 rounded-full text-xs font-sans font-extrabold flex items-center justify-center gap-1.5 transition-all outline-none cursor-pointer flex-1 relative z-10 ${
                activeRoom === "shared" ? "btn-3d-primary text-white shadow-md scale-102" : "text-[var(--theme-text)] opacity-70 hover:opacity-100"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Global Lobby</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveRoom("admin");
                setIsLoadingMessages(true);
              }}
              className={`py-2 px-3 rounded-full text-xs font-sans font-extrabold flex items-center justify-center gap-1.5 transition-all outline-none cursor-pointer flex-1 relative z-10 ${
                activeRoom === "admin" ? "btn-3d-primary text-white shadow-md scale-102" : "text-[var(--theme-text)] opacity-70 hover:opacity-100"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Support Desk</span>
            </button>
          </div>
        </div>

        {/* Message logs area */}
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 relative scrollbar-none"
        >
          {isLoadingMessages ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--theme-text)] opacity-60 font-sans text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--theme-primary)]" />
              <span>Syncing message stream...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--theme-text)] opacity-60 font-sans text-xs text-center p-4 space-y-2">
              <HelpCircle className="w-8 h-8 opacity-40" />
              <span>No messages posted. Start the conversation!</span>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m, index) => {
                const isMe = m.sender === userProfile.phone;
                const isSystem = m.sender === "system";
                const isSupportAdmin = m.sender === "admin" || m.senderName.toLowerCase().includes("admin");

                if (isSystem) {
                  return (
                    <motion.div 
                      key={m.id || index} 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                      className="text-center"
                    >
                      <span className="inline-block px-3 py-1 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[11px] font-sans text-[var(--theme-text)] opacity-75 rounded-full shadow-xs">
                        {m.text}
                      </span>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={m.id || index}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
                    className={`flex flex-col max-w-[85%] sm:max-w-[70%] space-y-1.5 ${
                      isMe ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    {/* Sender metadata info */}
                    <div className="flex items-center gap-1.5 text-[11px] font-sans text-[var(--theme-text)] opacity-70 px-1">
                      {!isMe && (
                        <span className={`font-sans font-extrabold truncate max-w-[120px] ${isSupportAdmin ? 'text-[var(--theme-accent)]' : 'text-[var(--theme-primary)]'}`}>
                          {isSupportAdmin ? "Support" : m.senderName}
                        </span>
                      )}
                      {isMe && (
                        <span className="font-sans font-extrabold text-[var(--theme-primary)] truncate max-w-[120px]">
                          You
                        </span>
                      )}
                      <span className="opacity-40">•</span>
                      <span className="font-medium">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Message body frame bubble */}
                    <div
                      className={`rounded-2xl px-4 py-3 space-y-2 text-[12.5px] font-sans leading-relaxed transition-all duration-200 shadow-sm ${
                        isMe
                          ? "btn-3d-primary text-white rounded-tr-none font-medium"
                          : isSupportAdmin
                          ? "btn-3d-accent text-white rounded-tl-none font-medium"
                          : "theme-card card-playful-3d border border-[var(--theme-card-border)] text-[var(--theme-text)] rounded-tl-none font-medium"
                      }`}
                    >
                      {/* Text field */}
                      {m.text && <p className="whitespace-pre-wrap select-text">{m.text}</p>}

                      {/* Attached image if present */}
                      {m.image && (
                        <div className="rounded-xl overflow-hidden border border-[var(--theme-card-border)] mt-1 max-w-full shadow-md bg-[var(--theme-bg)]">
                          <img
                            src={m.image}
                            alt="Message attachment upload screen"
                            className="max-h-60 w-auto object-contain cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating scroll bottom button */}
        {showScrollBottomBtn && (
          <button
            type="button"
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              setShowScrollBottomBtn(false);
            }}
            className="absolute bottom-[76px] left-1/2 -translate-x-1/2 z-30 btn-3d-primary text-white p-2.5 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-all outline-none cursor-pointer animate-bounce"
            title="Scroll to bottom"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}

        {/* Input box form panel */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-bg)]/95 backdrop-blur-md space-y-3 shrink-0">
          
          {/* File attachment preview row if chosen */}
          {base64Image && (
            <div className="flex items-center justify-between bg-[var(--theme-bg)] p-2.5 rounded-[var(--theme-radius)] text-xs font-sans text-[var(--theme-text)] border border-[var(--theme-card-border)] animate-fadeIn">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-[var(--theme-primary)] block shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-xs font-medium">{imageName || "Custom Screenshot Attachment"}</span>
              </div>
              <button
                type="button"
                onClick={clearAttachment}
                className="text-xs text-rose-500 font-black uppercase tracking-wider px-1.5 cursor-pointer outline-none"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex gap-2 items-center">
            {/* Image attachment file input button */}
            {activeRoom === "admin" ? (
              <label className="w-11 h-11 btn-3d-secondary text-[var(--theme-text)] rounded-[var(--theme-radius)] flex items-center justify-center cursor-pointer shrink-0" title="Attach screenshot payload">
                <Image className="w-4.5 h-4.5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="w-11 h-11 bg-[var(--theme-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] opacity-30 rounded-[var(--theme-radius)] flex items-center justify-center cursor-not-allowed shrink-0" title="Attachment uploading disabled in global lobby (Support only)">
                <Image className="w-4.5 h-4.5" />
              </div>
            )}

            {/* Main message text-input */}
            <input
              type="text"
              placeholder={activeRoom === "shared" ? "Write a message to global lobby..." : "Ask support regarding deposit, node, or payout..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full px-4 h-11 bg-[var(--theme-bg)] border border-[var(--theme-card-border)] focus:border-[var(--theme-primary)] text-[var(--theme-text)] text-xs rounded-[var(--theme-radius)] outline-none transition-all font-sans placeholder:opacity-50"
            />

            {/* Composal dispatch submit trigger */}
            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && !base64Image)}
              className="w-11 h-11 btn-3d-primary text-white rounded-[var(--theme-radius)] flex items-center justify-center transition-colors shrink-0 outline-none cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
