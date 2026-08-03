/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { UserProfile, ChatMessage } from "../types";
import { 
  Send, 
  Image as ImageIcon, 
  MessageSquare, 
  User, 
  Search, 
  X, 
  Globe, 
  Clock, 
  CheckCircle2, 
  Loader2,
  Paperclip
} from "lucide-react";

interface Conversation {
  roomId: string;
  userPhone: string;
  userName: string;
  lastMessage: string;
  lastTimestamp: string;
}

interface AdminChatDeskProps {
  usersList: UserProfile[];
}

export default function AdminChatDesk({ usersList }: AdminChatDeskProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("shared");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [base64Image, setBase64Image] = useState<string>("");
  const [imageName, setImageName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  
  // Search state for users to start new chat
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Poll active direct conversations & list
  useEffect(() => {
    let active = true;
    const fetchConversations = async () => {
      try {
        const res = await fetch("/api/admin/chat/conversations");
        if (res.ok && active) {
          const list = await res.json();
          setConversations(list);
          setIsLoadingConversations(false);
        }
      } catch (err) {
        console.error("Failed to load active direct conversations:", err);
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Poll messages for selected active room
  useEffect(() => {
    let active = true;
    setIsLoadingMessages(true);

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat/room/${selectedRoomId}`);
        if (res.ok && active) {
          const list = await res.json();
          setMessages(list);
          setIsLoadingMessages(false);
        }
      } catch (err) {
        console.error("Failed to fetch chat room messages:", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedRoomId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Convert uploaded image to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image file size limit is 2MB. Please select a smaller attachment file.");
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

    setInputText("");
    clearAttachment();

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoomId,
          sender: "admin",
          senderName: "Support Admin Team",
          text: textToSend,
          image: imageToSend
        })
      });

      if (!res.ok) {
        throw new Error("Failed to send support response.");
      }

      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      alert("Error sending response: " + err);
    } finally {
      setIsSending(false);
    }
  };

  // Find users not currently on the fast convo list to start a chat
  const filteredUsersToStartChat = usersList.filter(u => {
    const matchesSearch = u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.phone.includes(searchQuery);
    const alreadyConnected = conversations.some(c => c.userPhone === u.phone);
    return matchesSearch && !alreadyConnected && u.phone !== "admin";
  });

  const getTargetRoomUserObj = () => {
    if (selectedRoomId === "shared") return null;
    const phone = selectedRoomId.replace("direct_", "");
    return usersList.find(u => u.phone === phone) || null;
  };

  const activeUser = getTargetRoomUserObj();

  return (
    <div className="flex-1 w-full flex bg-[var(--theme-card-bg)] text-[var(--theme-text)] font-sans overflow-hidden relative">
      
      {/* LEFT AREA: Chat Selection sidebar */}
      <div className="w-80 border-r border-[var(--theme-card-border)] flex flex-col shrink-0 bg-[var(--theme-bg)]/30">
        <div className="p-4 border-b border-[var(--theme-card-border)] space-y-3 shrink-0">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-[var(--theme-text)] opacity-70">Conversations</h3>
          
          {/* Direct search to start new chats */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--theme-text)] opacity-50" />
            <input 
              type="text"
              placeholder="Start chat (search phone...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] focus:border-[var(--theme-primary)] rounded-[var(--theme-radius)] pl-9 pr-4 py-2 text-xs font-bold text-[var(--theme-text)] outline-none transition-all placeholder-[var(--theme-text)]/40"
            />
          </div>
        </div>

        {/* List scrollable box */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {searchQuery ? (
            <div className="space-y-1">
              <span className="text-[12px] font-sans px-3 text-[var(--theme-text)] opacity-70 uppercase font-bold tracking-wide block mb-1">New Contacts ({filteredUsersToStartChat.length})</span>
              {filteredUsersToStartChat.length === 0 ? (
                <div className="p-3 text-xs text-[var(--theme-text)] opacity-50 text-center font-medium">No unconnected users matches search.</div>
              ) : (
                filteredUsersToStartChat.slice(0, 10).map((u) => (
                  <button
                    key={u.phone}
                    onClick={() => {
                      setSelectedRoomId(`direct_${u.phone}`);
                      setSearchQuery("");
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-[var(--theme-radius)] hover:bg-[var(--theme-card-bg)] text-left outline-none transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 flex items-center justify-center text-[var(--theme-primary)] font-bold text-xs">
                      {u.username ? u.username[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[var(--theme-text)] truncate">{u.username || "Anonymous User"}</div>
                      <div className="text-[12px] font-sans text-[var(--theme-text)] opacity-60 truncate">{u.phone}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Global Chatroom Section */}
              <button
                onClick={() => setSelectedRoomId("shared")}
                className={`w-full flex items-center gap-3 p-3.5 rounded-[var(--theme-radius)] text-left outline-none transition-all cursor-pointer ${
                  selectedRoomId === "shared"
                    ? "bg-[var(--theme-primary)] text-white shadow-md font-bold"
                    : "hover:bg-[var(--theme-card-bg)] text-[var(--theme-text)] opacity-90"
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  selectedRoomId === "shared" ? "bg-white/20 text-white" : "bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 text-[var(--theme-accent)]"
                }`}>
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold truncate leading-tight">Global Channel</div>
                  <div className={`text-[12px] font-sans truncate mt-0.5 ${selectedRoomId === "shared" ? "text-white/80" : "text-[var(--theme-text)] opacity-60"}`}>
                    Public miner room
                  </div>
                </div>
              </button>

              {/* Direct active chats */}
              <div className="pt-3 border-t border-[var(--theme-card-border)] mt-2">
                <span className="text-[12px] font-sans px-3 text-[var(--theme-text)] opacity-70 uppercase font-bold tracking-wide block mb-1">Direct Sessions ({conversations.length})</span>
                {conversations.length === 0 ? (
                  <div className="p-6 text-xs text-[var(--theme-text)] opacity-50 text-center font-bold leading-relaxed">No direct support tickets yet.</div>
                ) : (
                  conversations.map((c) => {
                    const isActive = selectedRoomId === c.roomId;
                    return (
                      <button
                        key={c.roomId}
                        onClick={() => setSelectedRoomId(c.roomId)}
                        className={`w-full flex items-center gap-3 p-3 rounded-[var(--theme-radius)] text-left outline-none transition-all my-0.5 cursor-pointer ${
                          isActive
                            ? "bg-[var(--theme-bg)] text-[var(--theme-text)] shadow-inner border border-[var(--theme-card-border)] font-bold"
                            : "hover:bg-[var(--theme-bg)]/50 text-[var(--theme-text)] opacity-90"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 flex items-center justify-center text-[var(--theme-primary)] font-bold text-xs shrink-0">
                          {c.userName ? c.userName[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-baseline gap-1.5">
                            <span className="text-xs font-bold text-[var(--theme-text)] truncate">{c.userName}</span>
                            <span className="text-[11px] font-sans text-[var(--theme-text)] opacity-50 shrink-0">
                              {c.lastTimestamp ? new Date(c.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                            </span>
                          </div>
                          <div className="text-[12px] text-[var(--theme-text)] opacity-70 truncate mt-0.5 leading-normal">
                            {c.lastMessage}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT AREA: Chat Display Room Terminal */}
      <div className="flex-1 flex flex-col bg-[var(--theme-card-bg)]">
        
        {/* Selected Room Metadata bar */}
        <div className="px-6 py-4 border-b border-[var(--theme-card-border)] bg-[var(--theme-bg)]/30 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {selectedRoomId === "shared" ? (
              <>
                <div className="w-9 h-9 rounded-full bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 flex items-center justify-center text-[var(--theme-accent)] shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--theme-text)]">Global Chat Channel</h4>
                  <p className="text-[12px] font-sans text-[var(--theme-accent)] font-semibold">Broadcast updates and chats to all platform users</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-full bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 flex items-center justify-center text-[var(--theme-primary)] shrink-0 font-bold text-sm">
                  {activeUser?.username ? activeUser.username[0].toUpperCase() : "M"}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--theme-text)]">{activeUser?.username || "Direct Ticket"}</h4>
                  <p className="text-[12px] font-sans text-[var(--theme-text)] opacity-60">Phone: {selectedRoomId.replace("direct_", "")}</p>
                </div>
              </>
            )}
          </div>
          {selectedRoomId !== "shared" && activeUser && (
            <div className="text-right hidden md:block">
              <span className={`px-2 py-0.5 rounded text-[11px] font-sans font-extrabold uppercase ${
                activeUser.locked ? "bg-rose-500/15 text-rose-400 border border-rose-500/20" : "bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/20"
              }`}>
                {activeUser.locked ? "LOCKED" : "ACTIVE NODE"}
              </span>
              <div className="text-[12px] font-sans text-[var(--theme-text)] opacity-70 mt-1 font-bold">
                Balance: UGX {activeUser.points?.toLocaleString() || 0}
              </div>
            </div>
          )}
        </div>

        {/* Message streams bubble area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoadingMessages && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--theme-primary)]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <MessageSquare className="w-8 h-8 text-[var(--theme-text)] opacity-30" />
              <p className="text-xs text-[var(--theme-text)] opacity-60 max-w-sm font-bold">
                No conversations have transpired in this support room yet. Send a welcoming message to prompt miner activities!
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const uIsAdmin = m.sender === "admin";
              return (
                <div 
                  key={m.id}
                  className={`flex flex-col max-w-[80%] ${
                    uIsAdmin ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <span className="text-[12px] font-sans text-[var(--theme-text)] opacity-60 mb-1 font-bold">
                    {uIsAdmin ? "Support Agent" : m.senderName || "User"}
                  </span>
                  
                  <div className={`p-4 rounded-[var(--theme-radius)] ${
                    uIsAdmin 
                      ? "bg-[var(--theme-primary)] text-white rounded-tr-none shadow-md font-bold" 
                      : "bg-[var(--theme-bg)] text-[var(--theme-text)] rounded-tl-none border border-[var(--theme-card-border)] font-bold"
                  }`}>
                    {m.image && (
                      <img 
                        src={m.image} 
                        alt="attachment-img" 
                        referrerPolicy="no-referrer"
                        className="max-h-60 rounded-xl object-contain mb-2 max-w-full"
                      />
                    )}
                    {m.text && <p className="text-xs font-bold whitespace-pre-wrap leading-relaxed break-all">{m.text}</p>}
                  </div>

                  <span className="text-[11px] font-sans text-[var(--theme-text)] opacity-50 mt-1 font-mono">
                    {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message inputs form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--theme-card-border)] bg-[var(--theme-bg)]/30 space-y-3 shrink-0">
          
          {/* Attachment indicator if image captured */}
          {base64Image && (
            <div className="px-3.5 py-1.5 bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 rounded-2xl flex items-center justify-between w-max max-w-full gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-3.5 h-3.5 text-[var(--theme-primary)] shrink-0" />
                <span className="text-[12px] font-sans text-[var(--theme-text)] truncate">{imageName || "image_loaded.png"}</span>
              </div>
              <button 
                type="button" 
                onClick={clearAttachment}
                className="text-[var(--theme-text)] opacity-60 hover:opacity-100 transition-colors cursor-pointer"
                id="ClearAttachmentBtn"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            {/* Attachment paperclip trigger */}
            <label className="p-3 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] hover:bg-[var(--theme-bg)] text-[var(--theme-text)] opacity-80 hover:opacity-100 transition-colors rounded-[var(--theme-radius)] shrink-0 flex items-center justify-center cursor-pointer relative shadow-md">
              <input 
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Paperclip className="w-4 h-4" />
            </label>

            <input 
              type="text"
              placeholder={selectedRoomId === "shared" ? "Write broadcast to global system room..." : "Replying support ticket to miner..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] focus:border-[var(--theme-primary)] rounded-[var(--theme-radius)] px-4 text-xs font-bold text-[var(--theme-text)] outline-none transition-all placeholder-[var(--theme-text)]/40"
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && !base64Image) || isSending}
              className="p-3 bg-[var(--theme-primary)] hover:brightness-110 disabled:opacity-50 text-white rounded-[var(--theme-radius)] shrink-0 flex items-center justify-center transition-all outline-none shadow-md cursor-pointer"
              id="AdminChatDeskSendBtn"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>

    </div>
  );
}
