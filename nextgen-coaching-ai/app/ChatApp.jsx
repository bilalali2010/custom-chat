"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const QUICK_OPTIONS = ["Courses", "Fee Structure", "Class Timings", "Admissions"];

// Admin-only debug labels — shown next to each bot reply when the chat
// is opened with ?admin=1, so you can see which tier answered without
// guessing from the wording alone.
const SOURCE_LABELS = {
  faq: { text: "FAQ", color: "#2F9E63" },
  ai: { text: "AI", color: "#2A63C7" },
  "faq-fallback": { text: "FAQ (fallback)", color: "#B8863B" },
  "contact-fallback": { text: "AI unreachable", color: "#C0392B" },
  error: { text: "Server error", color: "#C0392B" }
};

/* ---------------- MARKDOWN-LITE RENDERER ----------------
   The AI model replies with light markdown (**bold**, "- " bullets).
   This turns that into properly structured, styled HTML instead of
   showing raw asterisks and hyphens.
------------------------------------------------------------ */

function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

function parseBlocks(raw) {
  // Normalize: break inline "... - **Label:**" runs onto their own line,
  // so replies that arrive as one long line still form a proper list.
  const normalized = raw
    .replace(/\r\n/g, "\n")
    .replace(/ {2,}/g, "\n") // model often uses double-spaces in place of real line breaks
    .replace(/\s*-\s+(?=\*\*)/g, "\n- ")
    .replace(/\n{3,}/g, "\n\n");

  const lines = normalized.split("\n").map((l) => l.trim());
  const blocks = [];
  let currentList = null;

  for (const line of lines) {
    if (!line) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      continue;
    }
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList) currentList = { type: "list", items: [] };
      currentList.items.push(bulletMatch[1]);
    } else {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({ type: "para", text: line });
    }
  }
  if (currentList) blocks.push(currentList);
  return blocks;
}

function MessageContent({ content, isUser }) {
  const blocks = parseBlocks(content || "");
  return (
    <div className={`ngc-msg${isUser ? " ngc-msg-user" : ""}`}>
      {blocks.map((block, i) =>
        block.type === "list" ? (
          <ul key={i}>
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{renderInline(block.text, `${i}`)}</p>
        )
      )}
    </div>
  );
}

/* ---------------- SEAL MARK ---------------- */

function SealMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <polygon
        points="20,2 35,10.5 35,29.5 20,38 5,29.5 5,10.5"
        fill="none"
        stroke="#B8863B"
        strokeWidth="1.4"
      />
      <polygon
        points="20,7 30,13 30,27 20,33 10,27 10,13"
        fill="rgba(184,134,59,0.14)"
      />
      <text
        x="20"
        y="24.5"
        textAnchor="middle"
        fontFamily="'Source Serif 4', Georgia, serif"
        fontSize="12.5"
        fontWeight="600"
        fill="#D9B876"
      >
        NG
      </text>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M2.5 10L17 3l-4.5 15-3.7-6.1L2.5 10z"
        stroke="#ffffff"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function ChatApp() {
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get("admin") === "1";

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Welcome to **NextGen Coaching Institute**. I can help with course details, fee structure, class timings, and the admissions process. How can I help you today?",
      isWelcome: true,
      time: new Date()
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text) {
    if (!text?.trim() || loading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, time: new Date() }
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          source: data.source,
          time: new Date()
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          time: new Date()
        }
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <SealMark />
            <div>
              <div style={styles.brand}>NextGen Coaching Institute</div>
              <div style={styles.brandSub}>Admissions &amp; Programs Assistant</div>
            </div>
          </div>
          <div style={styles.statusWrap}>
            <span style={styles.statusDot} />
            <span style={styles.statusText}>Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="ngc-scroll" style={styles.messages}>
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div
                key={i}
                style={{
                  ...styles.row,
                  justifyContent: isUser ? "flex-end" : "flex-start"
                }}
              >
                {!isUser && (
                  <div style={styles.avatar}>
                    <span style={styles.avatarText}>NG</span>
                  </div>
                )}

                <div style={styles.bubbleCol}>
                  <div
                    style={{
                      ...styles.bubble,
                      ...(isUser ? styles.userBubble : styles.botBubble)
                    }}
                  >
                    <MessageContent content={m.content} isUser={isUser} />

                    {m.isWelcome && (
                      <div style={styles.quickWrap}>
                        {QUICK_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            className="ngc-quick-btn"
                            style={styles.quickBtn}
                            onClick={() => sendMessage(opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      ...styles.time,
                      textAlign: isUser ? "right" : "left",
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <span>
                      {m.time.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                    {isAdmin && !isUser && m.source && SOURCE_LABELS[m.source] && (
                      <span
                        style={{
                          ...styles.sourceBadge,
                          color: SOURCE_LABELS[m.source].color,
                          borderColor: SOURCE_LABELS[m.source].color
                        }}
                      >
                        {SOURCE_LABELS[m.source].text}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={styles.row}>
              <div style={styles.avatar}>
                <span style={styles.avatarText}>NG</span>
              </div>
              <div style={{ ...styles.bubble, ...styles.botBubble }}>
                <span className="ngc-typing">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={styles.inputBar}>
          <input
            ref={inputRef}
            className="ngc-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about courses, fees, timings, admissions…"
            style={styles.input}
          />
          <button
            className="ngc-send-btn"
            onClick={() => sendMessage(input)}
            style={styles.send}
            disabled={!input.trim() || loading}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          Powered by Bilal AI Studio
          {isAdmin && (
            <span style={styles.adminNote}> · Admin mode — data/coaching.json</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const styles = {
  page: {
    height: "100vh",
    background: "var(--paper)",
    display: "flex",
    justifyContent: "center",
    alignItems: "stretch",
    fontFamily: "var(--font-body)"
  },

  shell: {
    width: "100%",
    maxWidth: 760,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "var(--card)",
    boxShadow: "0 0 0 1px var(--line)"
  },

  header: {
    padding: "16px 22px",
    background: "linear-gradient(135deg, var(--ink) 0%, var(--ink-2) 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 1px 0 rgba(184,134,59,0.35)"
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12
  },

  brand: {
    fontFamily: "var(--font-display)",
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: 0.2,
    lineHeight: 1.25
  },

  brandSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.62)",
    marginTop: 2,
    letterSpacing: 0.2
  },

  statusWrap: {
    display: "flex",
    alignItems: "center",
    gap: 6
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--online)",
    boxShadow: "0 0 0 3px rgba(47,158,99,0.22)"
  },

  statusText: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.75)",
    fontWeight: 500
  },

  messages: {
    flex: 1,
    padding: "20px 18px",
    overflowY: "auto",
    background:
      "repeating-linear-gradient(180deg, transparent, transparent 31px, rgba(16,27,45,0.028) 32px)"
  },

  row: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 16
  },

  avatar: {
    width: 30,
    height: 30,
    minWidth: 30,
    borderRadius: "50%",
    background: "var(--ink)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 0 1px rgba(184,134,59,0.4)"
  },

  avatarText: {
    fontFamily: "var(--font-display)",
    fontSize: 10.5,
    fontWeight: 600,
    color: "var(--gold-soft, #EBD9B6)"
  },

  bubbleCol: {
    display: "flex",
    flexDirection: "column",
    maxWidth: "76%"
  },

  bubble: {
    padding: "13px 15px",
    borderRadius: 14,
    fontSize: 14.5,
    lineHeight: 1.6
  },

  botBubble: {
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--line)",
    borderTopLeftRadius: 4,
    boxShadow: "0 1px 2px rgba(16,27,45,0.04)"
  },

  userBubble: {
    background: "var(--ink)",
    color: "#ffffff",
    borderTopRightRadius: 4
  },

  time: {
    fontSize: 11,
    color: "var(--text-muted)",
    marginTop: 5,
    padding: "0 3px"
  },

  sourceBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    border: "1px solid",
    borderRadius: 999,
    padding: "1px 7px"
  },

  quickWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },

  quickBtn: {
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid var(--gold)",
    background: "#ffffff",
    color: "var(--gold-deep)",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    touchAction: "manipulation"
  },

  inputBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 18px",
    borderTop: "1px solid var(--line)",
    background: "var(--card)"
  },

  input: {
    flex: 1,
    padding: "12px 16px",
    fontSize: 14.5,
    borderRadius: 999,
    border: "1.5px solid var(--line)",
    outline: "none",
    background: "var(--paper)",
    color: "var(--text)",
    fontFamily: "var(--font-body)"
  },

  send: {
    width: 42,
    height: 42,
    minWidth: 42,
    borderRadius: "50%",
    border: "none",
    background: "var(--ink)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
  },

  footer: {
    textAlign: "center",
    fontSize: 11,
    padding: "8px 6px",
    color: "var(--text-muted)",
    borderTop: "1px solid var(--line)",
    background: "var(--card)"
  },

  adminNote: {
    color: "var(--gold-deep)",
    fontWeight: 600
  }
};
