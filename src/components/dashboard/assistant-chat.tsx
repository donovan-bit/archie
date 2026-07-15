"use client";

import { useEffect, useRef, useState } from "react";
import { BotIcon, LoaderCircleIcon, MicIcon, SendIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = { role: "user" | "assistant"; text: string };
type PendingAction = { toolUseId: string; label: string } | null;

// The Anthropic message history is round-tripped to the server as-is
// between turns -- this component never inspects its shape.
type AnthropicHistory = unknown[];

type AssistantResult = {
  history: AnthropicHistory;
  assistantText: string[];
  pendingAction: PendingAction;
};

// Minimal shape of the (non-standard, Chrome/Edge/Safari-only) Web Speech
// API this component uses for voice-to-text input.
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

async function postAssistant(body: Record<string, unknown>): Promise<AssistantResult> {
  const res = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<AnthropicHistory>([]);
  const [pending, setPending] = useState<PendingAction>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-AU";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    // Feature support can only be known client-side (SSR has no `window`),
    // so this can't be derived during render -- it has to live in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeechSupported(true);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  function toggleListening() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      recognition.start();
      setListening(true);
    }
  }

  function applyResult(data: AssistantResult) {
    setHistory(data.history);
    setMessages((m) => [...m, ...data.assistantText.map((text) => ({ role: "assistant" as const, text }))]);
    setPending(data.pendingAction);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setBusy(true);
    try {
      applyResult(await postAssistant({ type: "message", history, text: trimmed }));
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Something went wrong -- try again." }]);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(approved: boolean) {
    if (!pending || busy) return;
    setBusy(true);
    try {
      applyResult(await postAssistant({ type: "confirm", history, toolUseId: pending.toolUseId, approved }));
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Something went wrong -- try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        className="fixed bottom-5 right-5 z-40 size-12 rounded-full shadow-lg"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Archie chat" : "Open Archie chat"}
      >
        {open ? <XIcon className="size-5" /> : <BotIcon className="size-5" />}
      </Button>

      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border bg-background shadow-xl">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Archie</p>
            <p className="text-xs text-muted-foreground">Ask about your to-do list, or tell it what to do.</p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Try &ldquo;what&rsquo;s on my list today?&rdquo; or &ldquo;mark pay myself as done&rdquo;.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {m.text}
              </div>
            ))}
            {pending && (
              <div className="flex flex-col gap-2 rounded-lg border bg-accent/50 px-3 py-2 text-sm">
                <p>{pending.label}?</p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" disabled={busy} onClick={() => confirm(true)}>
                    Confirm
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => confirm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {busy && <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t p-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={pending ? "Resolve the confirmation above first…" : "Ask or tell Archie something…"}
              disabled={busy || Boolean(pending)}
            />
            {speechSupported && (
              <Button
                type="button"
                size="icon"
                variant={listening ? "default" : "outline"}
                disabled={busy || Boolean(pending)}
                onClick={toggleListening}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
              >
                <MicIcon className="size-4" />
              </Button>
            )}
            <Button type="submit" size="icon" disabled={busy || Boolean(pending) || !input.trim()}>
              <SendIcon className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
