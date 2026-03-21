import { useEffect, useMemo, useRef, useState } from "react";
import { intelDatabase } from "./data/intelDatabase";

type IntelEntry = {
  code: string;
  title: string;
  subtitle: string;
  image: string;
  text: string;
};

type BootStage = "booting" | "ready";

type HistoryItem = {
  code: string;
  title: string;
  openedAt: number;
};

const HISTORY_STORAGE_KEY = "intel_terminal_history_v1";
const MAX_HISTORY = 12;

const bootLines = [
  "보안성 검토 중...",
  "방첩 프로토콜 가동...",
  "내부 인증 채널 동기화...",
  "접근 권한 검증 중...",
  "최종 승인됨.",
];

export default function App() {
  const [bootStage, setBootStage] = useState<BootStage>("booting");
  const [visibleBootLines, setVisibleBootLines] = useState<string[]>([]);
  const [inputCode, setInputCode] = useState("");
  const [selectedIntel, setSelectedIntel] = useState<IntelEntry | null>(null);
  const [statusText, setStatusText] = useState("대기 중. 접근 코드를 입력하세요.");
  const [displayedText, setDisplayedText] = useState("");
  const [isDenied, setIsDenied] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [screenFlicker, setScreenFlicker] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const bootSoundRef = useRef<HTMLAudioElement | null>(null);
  const openSoundRef = useRef<HTMLAudioElement | null>(null);
  const deniedSoundRef = useRef<HTMLAudioElement | null>(null);
  const closeSoundRef = useRef<HTMLAudioElement | null>(null);
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);

  const typingPoolRef = useRef<HTMLAudioElement[]>([]);
  const typingIndexRef = useRef(0);

  const hasUnlockedAudioRef = useRef(false);
  const deniedLoopRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const openDocumentTimeoutRef = useRef<number | null>(null);

  const normalizedDatabase = useMemo(() => {
    return intelDatabase.map((item) => ({
      ...item,
      normalizedCode: item.code.trim().toUpperCase(),
    }));
  }, []);

  const safePlay = (audio: HTMLAudioElement | null, reset = false) => {
    if (!audio) return;
    try {
      if (reset) audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  const startBgm = () => {
    if (!bgmRef.current) return;
    try {
      bgmRef.current.loop = true;
      if (bgmRef.current.paused) {
        bgmRef.current.currentTime = 0;
        bgmRef.current.play().catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  const playClick = () => {
    if (!clickSoundRef.current) return;
    try {
      clickSoundRef.current.currentTime = 0;
      clickSoundRef.current.play().catch(() => {});
    } catch {
      // ignore
    }
  };

  const playTypingSound = () => {
    const pool = typingPoolRef.current;
    if (!pool.length) return;

    const audio = pool[typingIndexRef.current];
    typingIndexRef.current = (typingIndexRef.current + 1) % pool.length;

    try {
      audio.pause();
      audio.currentTime = Math.random() * 0.03;
      audio.play().catch(() => {});
    } catch {
      // ignore
    }
  };

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item) =>
          item &&
          typeof item.code === "string" &&
          typeof item.title === "string" &&
          typeof item.openedAt === "number"
      ) as HistoryItem[];
    } catch {
      return [];
    }
  };

  const saveHistory = (nextHistory: HistoryItem[]) => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    } catch {
      // ignore
    }
  };

  const addHistory = (entry: IntelEntry) => {
    setHistory((prev) => {
      const next: HistoryItem[] = [
        {
          code: entry.code.trim().toUpperCase(),
          title: entry.title,
          openedAt: Date.now(),
        },
        ...prev.filter(
          (item) => item.code !== entry.code.trim().toUpperCase()
        ),
      ].slice(0, MAX_HISTORY);

      saveHistory(next);
      return next;
    });
  };

  const clearHistory = () => {
    playClick();
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore
    }
    setStatusText("열람 기록이 삭제되었습니다.");
  };

  const formatOpenedTime = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleString("ko-KR", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const stopDeniedAlarm = () => {
    setIsDenied(false);
    if (deniedLoopRef.current) {
      window.clearInterval(deniedLoopRef.current);
      deniedLoopRef.current = null;
    }
  };

  const startDeniedAlarm = () => {
    setIsDenied(true);

    if (deniedLoopRef.current) {
      window.clearInterval(deniedLoopRef.current);
      deniedLoopRef.current = null;
    }

    safePlay(deniedSoundRef.current, true);

    deniedLoopRef.current = window.setInterval(() => {
      safePlay(deniedSoundRef.current, true);
    }, 850);

    window.setTimeout(() => {
      stopDeniedAlarm();
    }, 3000);
  };

  const openDocument = (entry: IntelEntry) => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (openDocumentTimeoutRef.current) {
      window.clearTimeout(openDocumentTimeoutRef.current);
      openDocumentTimeoutRef.current = null;
    }

    stopDeniedAlarm();
    setDisplayedText("");
    setStatusText("접근 승인됨...");
    safePlay(openSoundRef.current, true);

    openDocumentTimeoutRef.current = window.setTimeout(() => {
      setSelectedIntel(entry);
      setInputCode(entry.code.trim().toUpperCase());
      setStatusText(entry.title + " 문서 열람 중");
      addHistory(entry);
    }, 500);
  };

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    bgmRef.current = new Audio("/sounds/bgm.mp3");
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.22;
    bgmRef.current.preload = "auto";

    bootSoundRef.current = new Audio("/sounds/boot.mp3");
    bootSoundRef.current.volume = 0.55;
    bootSoundRef.current.preload = "auto";

    openSoundRef.current = new Audio("/sounds/open.mp3");
    openSoundRef.current.volume = 0.7;
    openSoundRef.current.preload = "auto";

    deniedSoundRef.current = new Audio("/sounds/denied.mp3");
    deniedSoundRef.current.volume = 0.62;
    deniedSoundRef.current.preload = "auto";

    closeSoundRef.current = new Audio("/sounds/close.mp3");
    closeSoundRef.current.volume = 0.5;
    closeSoundRef.current.preload = "auto";

    clickSoundRef.current = new Audio("/sounds/click.mp3");
    clickSoundRef.current.volume = 0.38;
    clickSoundRef.current.preload = "auto";

    typingPoolRef.current = Array.from({ length: 6 }, () => {
      const a = new Audio("/sounds/typing.mp3");
      a.volume = 0.14;
      a.preload = "auto";
      return a;
    });

    const unlockAudio = () => {
      if (hasUnlockedAudioRef.current) return;
      hasUnlockedAudioRef.current = true;

      startBgm();
      safePlay(bootSoundRef.current, true);
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (openDocumentTimeoutRef.current) {
        window.clearTimeout(openDocumentTimeoutRef.current);
        openDocumentTimeoutRef.current = null;
      }

      if (deniedLoopRef.current) {
        window.clearInterval(deniedLoopRef.current);
        deniedLoopRef.current = null;
      }

      [
        bgmRef.current,
        bootSoundRef.current,
        openSoundRef.current,
        deniedSoundRef.current,
        closeSoundRef.current,
        clickSoundRef.current,
        ...typingPoolRef.current,
      ].forEach((audio) => {
        if (!audio) return;
        try {
          audio.pause();
          audio.src = "";
        } catch {
          // ignore
        }
      });
    };
  }, []);

  useEffect(() => {
    let index = 0;

    const interval = window.setInterval(() => {
      setVisibleBootLines((prev) => {
        if (index < bootLines.length) {
          return [...prev, bootLines[index]];
        }
        return prev;
      });

      if (Math.random() > 0.75) {
        setGlitch(true);
        window.setTimeout(() => setGlitch(false), 90);
      }

      index++;

      if (index >= bootLines.length) {
        window.clearInterval(interval);

        window.setTimeout(() => {
          setBootStage("ready");
          setStatusText("접근 승인됨. 코드 입력 대기 중.");
        }, 700);
      }
    }, 900);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (Math.random() > 0.86) {
        setGlitch(true);
        setScreenFlicker(true);

        window.setTimeout(() => setGlitch(false), 120);
        window.setTimeout(() => setScreenFlicker(false), 70);
      }
    }, 1100);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (!selectedIntel) {
      setDisplayedText("");
      return;
    }

    let cancelled = false;
    let charIndex = 0;
    const fullText = selectedIntel.text ?? "";

    setDisplayedText("");

    const typeNext = () => {
      if (cancelled) return;

      if (charIndex >= fullText.length) {
        typingTimeoutRef.current = null;
        return;
      }

      const nextIndex = charIndex + 1;
      const nextText = fullText.slice(0, nextIndex);
      const currentChar = fullText[charIndex] ?? "";

      setDisplayedText(nextText);
      charIndex = nextIndex;

      const shouldPlayTyping =
        currentChar.trim() !== "" &&
        currentChar !== "\n" &&
        (Math.random() > 0.4 || charIndex % 3 === 0);

      if (shouldPlayTyping) {
        playTypingSound();
      }

      if (charIndex >= fullText.length) {
        typingTimeoutRef.current = null;
        return;
      }

      const nextDelay =
        currentChar === "\n"
          ? 55 + Math.random() * 35
          : currentChar === "." ||
            currentChar === "," ||
            currentChar === "!" ||
            currentChar === "?"
          ? 45 + Math.random() * 40
          : 14 + Math.random() * 18;

      typingTimeoutRef.current = window.setTimeout(typeNext, nextDelay);
    };

    typingTimeoutRef.current = window.setTimeout(typeNext, 120);

    return () => {
      cancelled = true;
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [selectedIntel]);

  const handleSubmit = () => {
    startBgm();
    playClick();

    const code = inputCode.trim().toUpperCase();

    if (!code) {
      setStatusText("코드를 입력하세요.");
      return;
    }

    const found = normalizedDatabase.find(
      (item) => item.normalizedCode === code
    );

    if (found) {
      openDocument(found);
    } else {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (openDocumentTimeoutRef.current) {
        window.clearTimeout(openDocumentTimeoutRef.current);
        openDocumentTimeoutRef.current = null;
      }

      setSelectedIntel(null);
      setDisplayedText("");
      setStatusText("ACCESS DENIED");
      startDeniedAlarm();
    }
  };

  const handleReset = () => {
    startBgm();
    playClick();

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (openDocumentTimeoutRef.current) {
      window.clearTimeout(openDocumentTimeoutRef.current);
      openDocumentTimeoutRef.current = null;
    }

    stopDeniedAlarm();
    setSelectedIntel(null);
    setDisplayedText("");
    setInputCode("");
    setStatusText("대기 중. 접근 코드를 입력하세요.");

    safePlay(closeSoundRef.current, true);
  };

  const handleOpenFromHistory = (code: string) => {
    startBgm();
    playClick();

    const found = normalizedDatabase.find(
      (item) => item.normalizedCode === code
    );

    if (!found) {
      setStatusText("기록된 문서를 현재 데이터베이스에서 찾을 수 없습니다.");
      return;
    }

    openDocument(found);
  };

  return (
    <div
      style={{
        position: "relative",
        background: "linear-gradient(180deg, #06111f 0%, #040b14 100%)",
        minHeight: "100vh",
        color: "#ffffff",
        padding: "20px 14px 40px",
        fontFamily: "monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: "980px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: glitch ? "translateX(2px)" : "none",
          filter: glitch
            ? "contrast(1.22) brightness(1.08) saturate(0.95)"
            : "none",
          opacity: screenFlicker ? 0.93 : 1,
          transition:
            "transform 0.05s linear, opacity 0.05s linear, filter 0.05s linear",
        }}
      >
        <h2
          style={{
            color: "#ffffff",
            letterSpacing: "2px",
            textAlign: "center",
            margin: "8px 0 0",
            fontSize: "clamp(18px, 4vw, 28px)",
            textShadow: glitch
              ? "2px 0 rgba(255,0,70,0.35), -2px 0 rgba(80,180,255,0.35)"
              : "0 0 12px rgba(180,220,255,0.06)",
          }}
        >
          NEW SAN DIEGO INTELLIGENCE AGENCY
        </h2>

        <div
          style={{
            marginTop: "22px",
            width: "100%",
            background: "rgba(10, 20, 35, 0.7)",
            border: "1px solid rgba(160, 200, 255, 0.18)",
            borderRadius: "12px",
            padding: "16px",
            boxSizing: "border-box",
            boxShadow: "0 0 24px rgba(0, 0, 0, 0.28)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 22%, transparent 78%, rgba(255,255,255,0.02) 100%)",
            }}
          />

          <div
            style={{
              color: "#9ec2ff",
              fontSize: "13px",
              marginBottom: "10px",
              letterSpacing: "1px",
            }}
          >
            SYSTEM LOG
          </div>

          <div
            style={{
              minHeight: "110px",
              lineHeight: "1.7",
              fontSize: "14px",
              color: "#d7e6ff",
              wordBreak: "break-word",
              textShadow: "0 0 10px rgba(125, 180, 255, 0.05)",
            }}
          >
            {visibleBootLines.map((line, index) => (
              <div key={index}>&gt; {line}</div>
            ))}
          </div>
        </div>

        {bootStage === "ready" && (
          <div
            style={{
              marginTop: "18px",
              width: "100%",
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <input
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              onFocus={() => {
                playClick();
                startBgm();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="코드 입력"
              style={{
                flex: "1 1 240px",
                minWidth: "0",
                maxWidth: "420px",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(160, 200, 255, 0.2)",
                background: "rgba(8, 18, 32, 0.95)",
                color: "#ffffff",
                outline: "none",
                fontFamily: "monospace",
                fontSize: "15px",
                boxSizing: "border-box",
                boxShadow: "inset 0 0 10px rgba(0,0,0,0.28)",
              }}
            />

            <button
              onClick={handleSubmit}
              style={{
                padding: "12px 18px",
                borderRadius: "10px",
                border: "1px solid rgba(160, 200, 255, 0.25)",
                background: "#0f2340",
                color: "#ffffff",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "14px",
                boxShadow: "0 0 12px rgba(0,0,0,0.18)",
              }}
            >
              확인
            </button>

            {selectedIntel && (
              <button
                onClick={handleReset}
                style={{
                  padding: "12px 18px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "#122b1d",
                  color: "#dfffe8",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: "14px",
                  boxShadow: "0 0 12px rgba(0,0,0,0.18)",
                }}
              >
                문서 닫기
              </button>
            )}
          </div>
        )}

        <div
          style={{
            marginTop: "12px",
            color: isDenied
              ? "#ff3a3a"
              : statusText === "ACCESS DENIED"
              ? "#ff8b8b"
              : "#bcd4ff",
            fontSize: "14px",
            textAlign: "center",
            letterSpacing: "0.5px",
            minHeight: "22px",
            wordBreak: "break-word",
            animation: isDenied ? "deniedFlash 0.28s infinite" : "none",
            textShadow: isDenied ? "0 0 12px rgba(255, 0, 0, 0.45)" : "none",
          }}
        >
          {statusText}
        </div>

        {bootStage === "ready" && !selectedIntel && (
          <div
            style={{
              width: "100%",
              marginTop: "24px",
              background: "rgba(9, 19, 33, 0.84)",
              border: "1px solid rgba(160, 200, 255, 0.16)",
              borderRadius: "14px",
              padding: "16px",
              boxSizing: "border-box",
              boxShadow: "0 0 24px rgba(0, 0, 0, 0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginBottom: "12px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  color: "#9ec2ff",
                  fontSize: "13px",
                  letterSpacing: "1.3px",
                }}
              >
                RECENT ACCESS LOG
              </div>

              <button
                onClick={clearHistory}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(70,20,20,0.7)",
                  color: "#ffd0d0",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
              >
                기록 삭제
              </button>
            </div>

            {history.length === 0 ? (
              <div
                style={{
                  color: "#8ea8cf",
                  fontSize: "13px",
                  lineHeight: "1.7",
                }}
              >
                아직 이 기기에서 열람한 문서 기록이 없습니다.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "10px",
                }}
              >
                {history.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => handleOpenFromHistory(item.code)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "rgba(6, 14, 26, 0.92)",
                      border: "1px solid rgba(160, 200, 255, 0.14)",
                      borderRadius: "10px",
                      padding: "12px",
                      color: "#eaf2ff",
                      cursor: "pointer",
                      fontFamily: "monospace",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#ffffff",
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#8ea8cf",
                        }}
                      >
                        {formatOpenedTime(item.openedAt)}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "12px",
                        color: "#9ec2ff",
                        letterSpacing: "1px",
                      }}
                    >
                      CODE: {item.code}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedIntel && (
          <div
            style={{
              marginTop: "26px",
              width: "100%",
              background: "rgba(9, 19, 33, 0.9)",
              border: "1px solid rgba(160, 200, 255, 0.18)",
              borderRadius: "14px",
              padding: "18px",
              boxSizing: "border-box",
              boxShadow: "0 0 30px rgba(0, 0, 0, 0.35)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, transparent 24%, transparent 76%, rgba(255,255,255,0.015) 100%)",
              }}
            />

            <div
              style={{
                textAlign: "center",
                marginBottom: "18px",
                position: "relative",
                zIndex: 1,
              }}
            >
              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: "clamp(20px, 4.5vw, 28px)",
                  color: "#ffffff",
                  wordBreak: "break-word",
                }}
              >
                {selectedIntel.title}
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#bcd4ff",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  wordBreak: "break-word",
                }}
              >
                {selectedIntel.subtitle}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "18px",
                position: "relative",
                zIndex: 1,
              }}
            >
              <img
                src={selectedIntel.image}
                alt={selectedIntel.title}
                style={{
                  width: "100%",
                  maxWidth: "320px",
                  borderRadius: "12px",
                  border: "1px solid rgba(160, 200, 255, 0.18)",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>

            <div
              style={{
                border: "1px solid rgba(160, 200, 255, 0.15)",
                borderRadius: "12px",
                background: "rgba(4, 11, 20, 0.95)",
                padding: "14px",
                maxHeight: "50vh",
                overflowY: "auto",
                overflowX: "hidden",
                boxSizing: "border-box",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  color: "#8fb7ff",
                  fontSize: "12px",
                  marginBottom: "10px",
                  letterSpacing: "1.5px",
                }}
              >
                DOCUMENT CONTENT
              </div>

              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  textAlign: "left",
                  maxWidth: "100%",
                  fontSize: "14px",
                  lineHeight: "1.75",
                  color: "#eaf2ff",
                  textShadow: "0 0 8px rgba(180, 220, 255, 0.04)",
                }}
              >
                {displayedText}
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    marginLeft: "2px",
                    animation: "blink 1s step-end infinite",
                  }}
                >
                  █
                </span>
              </pre>
            </div>
          </div>
        )}

        {!selectedIntel && (
          <div
            style={{
              marginTop: "72px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              opacity: 0.9,
              textAlign: "center",
            }}
          >
            <img
              src="logo.png"
              alt="agency logo"
              style={{
                width: "min(160px, 42vw)",
                marginBottom: "20px",
                filter: "brightness(1.2)",
              }}
            />

            <div
              style={{
                fontSize: "14px",
                letterSpacing: "3px",
                color: "#bcd4ff",
                wordBreak: "break-word",
              }}
            >
              뉴 샌디에이고 데이터 체계
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          zIndex: 3,
          opacity: 0.12,
          background:
            "repeating-linear-gradient(to bottom, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 1px, transparent 2px, transparent 4px)",
          mixBlendMode: "overlay",
        }}
      />

      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          zIndex: 4,
          opacity: 0.055,
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18) 0 1px, transparent 1px),
            radial-gradient(circle at 80% 35%, rgba(255,255,255,0.14) 0 1px, transparent 1px),
            radial-gradient(circle at 45% 70%, rgba(255,255,255,0.16) 0 1px, transparent 1px),
            radial-gradient(circle at 65% 85%, rgba(255,255,255,0.1) 0 1px, transparent 1px)
          `,
          backgroundSize:
            "120px 120px, 160px 160px, 140px 140px, 180px 180px",
          animation: "noiseMove 0.22s steps(2) infinite",
        }}
      />

      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          zIndex: 1,
          boxShadow: "inset 0 0 120px rgba(0, 0, 0, 0.35)",
        }}
      />

      <style>
        {`
          @keyframes blink {
            50% {
              opacity: 0;
            }
          }

          @keyframes deniedFlash {
            0% { opacity: 1; }
            50% { opacity: 0.2; }
            100% { opacity: 1; }
          }

          @keyframes noiseMove {
            0% { transform: translate(0, 0); }
            25% { transform: translate(-6px, 4px); }
            50% { transform: translate(4px, -5px); }
            75% { transform: translate(-3px, -2px); }
            100% { transform: translate(0, 0); }
          }

          body {
            margin: 0;
            background: #06111f;
          }

          * {
            box-sizing: border-box;
          }

          input::placeholder {
            color: #8ea8cf;
          }

          button:hover {
            filter: brightness(1.08);
          }

          button:active {
            transform: translateY(1px);
          }

          ::-webkit-scrollbar {
            width: 8px;
          }

          ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 999px;
          }

          ::-webkit-scrollbar-thumb {
            background: rgba(160, 200, 255, 0.25);
            border-radius: 999px;
          }
        `}
      </style>
    </div>
  );
}