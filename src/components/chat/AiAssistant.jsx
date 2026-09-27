"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Trash2, ChevronLeft, MoreHorizontal, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/utils";
import { ChatReplySkeleton } from "@/components/ui/skeletons";

let nextId = 0;
const makeId = () => `msg-${Date.now()}-${(nextId += 1)}`;

export default function AiAssistant({ isOpen, onOpenChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);

  // Opened externally (e.g. the Profile support row) — no floating button.

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const toggleOpen = () => {
    haptic();
    onOpenChange(!isOpen);
  };

  const sendMessage = async (text) => {
    const content = (text ?? "").trim();
    if (!content || isLoading) return;

    const userMessage = { id: makeId(), role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: c }) => ({ role, content: c })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }
      const reply = (data?.reply ?? "").trim();
      if (!reply) throw new Error("Binny came back empty-handed. Please try again.");

      setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: reply }]);
    } catch (e) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    sendMessage(input);
  };

  const sendSuggestion = (suggestion) => {
    haptic();
    sendMessage(suggestion);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setInput("");
    haptic();
  };

  return (
    <>
      {/* Chat Full Screen */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 z-[96] flex flex-col bg-background"
          >
            {/* Native header */}
            <div className="relative z-20 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
              <div className="relative flex h-[52px] items-center justify-center px-2">
                <button
                  type="button"
                  onClick={toggleOpen}
                  className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all active:scale-95 cursor-pointer"
                  aria-label="Back"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                </button>
                <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Binny</h1>
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen((v) => !v); haptic(); }}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-all active:scale-95 cursor-pointer"
                    aria-label="Chat options"
                  >
                    <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <AnimatePresence>
                    {menuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30 cursor-default"
                          onClick={() => setMenuOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: -4 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          role="menu"
                          className="absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-2xl border border-border/60 bg-card p-1 shadow-lg"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { clearChat(); setMenuOpen(false); }}
                            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-foreground transition-colors active:bg-muted"
                          >
                            <Plus className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                            New chat
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { clearChat(); setMenuOpen(false); onOpenChange(false); }}
                            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-rose-600 transition-colors active:bg-muted"
                          >
                            <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                            Delete conversation
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto bg-muted/40 px-4 py-4"
              onClick={() => { if (menuOpen) setMenuOpen(false); }}
            >
              <div className="mx-auto w-full max-w-2xl space-y-4">
              {messages.length === 0 ? (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-row items-end gap-2">
                    <img
                      src="/mascot/arms-open-pose-clean.webp"
                      alt="Binny waving hello"
                      className="h-24 w-auto shrink-0 sm:h-28"
                    />
                    <div className="relative min-w-0 flex-1 rounded-2xl border border-border/60 bg-card px-4 py-2.5 text-[14px] leading-relaxed text-foreground shadow-sm sm:text-[15px]">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-b border-l border-border/60 bg-card"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute -left-[3px] top-1/2 h-[18px] w-[6px] -translate-y-1/2 bg-card"
                      />
                      <span className="relative">
                        Kumusta! I&apos;m <span className="font-semibold">Binny</span>, your waste buddy. Ask me what goes where, when your pickup is, or how to report a problem.
                      </span>
                    </div>
                  </div>
                  {[
                    "What goes in Malata?",
                    "When is my collection day?",
                    "How do I report overflowing bins?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => sendSuggestion(suggestion)}
                      className="block w-full cursor-pointer rounded-2xl border border-border/60 bg-card px-4 py-2.5 text-left text-[13px] font-medium text-foreground transition-all active:scale-[0.99] active:bg-muted"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : (
                messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] px-4 py-2.5 text-[15px] leading-relaxed rounded-2xl rounded-br-md bg-emerald-600 text-white">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex w-full justify-start">
                      <div className="flex w-full flex-row items-end gap-2">
                        <img
                          src="/mascot/arms-open-pose-clean.webp"
                          alt="Binny"
                          className="h-24 w-auto shrink-0 sm:h-28"
                        />
                        <div className="relative min-w-0 flex-1 rounded-2xl border border-border/60 bg-card px-4 py-2.5 text-[14px] leading-relaxed text-foreground shadow-sm sm:text-[15px]">
                          <span
                            aria-hidden="true"
                            className="absolute -left-[7px] bottom-12 h-3.5 w-3.5 rotate-45 border-b border-l border-border/60 bg-card"
                          />
                          <span
                            aria-hidden="true"
                            className="absolute -left-[3px] bottom-12 h-[18px] w-[6px] bg-card"
                          />
                          <span className="relative">{m.content}</span>
                        </div>
                      </div>
                    </div>
                  )
                )
              )}
              {isLoading && <ChatReplySkeleton />}
              {error && (
                <div className="flex justify-center my-2">
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 border border-rose-200">
                    {error}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-border/60 bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <form onSubmit={handleSubmit} className="relative mx-auto flex w-full max-w-2xl items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Binny..."
                  className="h-12 flex-1 rounded-full border border-border/60 bg-muted/50 px-4 text-[16px] outline-none transition-all focus:border-emerald-600/50 focus:bg-background focus:ring-4 focus:ring-emerald-600/10"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  aria-label="Send message"
                  className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center text-emerald-600 transition-all active:scale-95 active:opacity-70 disabled:opacity-30"
                >
                  <Send className="h-6 w-6 ml-0.5" strokeWidth={2} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
