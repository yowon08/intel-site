import { useEffect, useMemo, useRef, useState } from "react";
import { intelDatabase } from "./data/intelDatabase";

type IntelEntry = {
  code: string;
  title: string;
  subtitle: string;
  image: string;
  text: string;
  classification?: "마물";
};

type BootStage = "intro" | "collapse" | "reboot" | "ready";
type ThemeMode = "normal" | "poem" | "redzone";
type SystemMode = "intel" | "redzone";
type TransitionTarget = SystemMode | null;

type HistoryItem = {
  code: string;
  title: string;
  openedAt: number;
};

type NormalizedEntry = IntelEntry & {
  normalizedCode: string;
};

const HISTORY_STORAGE_KEYS: Record<SystemMode, string> = {
  intel: "intel_terminal_history_v2",
  redzone: "redzone_terminal_history_v1",
};

const MAX_HISTORY = 12;
const POEM_CODE = "P0EM";
const REDZONE_GATE_CODE = "R3DZ0NE";

const intelBootLines = [
  "보안성 검토 중...",
  "방첩 프로토콜 가동...",
  "내부 인증 채널 동기화...",
  "접근 권한 검증 중...",
  "감시 채널 봉인...",
  "잔존 신호 정리 중...",
  "출입 권한 대조...",
  "이상 없음.",
  "최종 승인됨.",
];

const redzoneBootLines = [
  "격리 채널 동기화...",
  "오염 자료 인덱스 결속...",
  "레드존 접근 토큰 검증...",
  "현장 대응 기록 연결 중...",
  "적성 개체 분류표 대조...",
  "봉인 프로토콜 준비 중...",
  "위험 등급 재산정...",
  "경계 상태 유지.",
  "접속 승인됨.",
];

const getSystemTheme = (systemMode: SystemMode, selectedIntel: IntelEntry | null): ThemeMode => {
  if (systemMode === "redzone") return "redzone";
  if (selectedIntel?.code?.trim().toUpperCase() === POEM_CODE) return "poem";
  return "normal";
};

export default function App() {
  
  const [bootStage, setBootStage] = useState<BootStage>("intro");
  const [introVisible, setIntroVisible] = useState(true);
  const [visibleBootLines, setVisibleBootLines] = useState<string[]>([]);
  const [inputCode, setInputCode] = useState("");
  const [selectedIntel, setSelectedIntel] = useState<IntelEntry | null>(null);
  const [statusText, setStatusText] = useState("대기 중. 접근 코드를 입력하세요.");
  const [displayedText, setDisplayedText] = useState("");
  const [isDenied, setIsDenied] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [screenFlicker, setScreenFlicker] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [themeMode, setThemeMode] = useState<ThemeMode>("normal");
  const [poemPulse, setPoemPulse] = useState(false);
  const [poemSweep, setPoemSweep] = useState(false);
  const [systemMode, setSystemMode] = useState<SystemMode>("intel");
  const [transitionTarget, setTransitionTarget] = useState<TransitionTarget>(null);
  const [transitionVisible, setTransitionVisible] = useState(false);
  const [redzoneUnlocked, setRedzoneUnlocked] = useState(() => {
  try {
    return localStorage.getItem("redzone_unlocked_v1") === "true";
  } catch {
    return false;
  }
});


  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const poemBgmRef = useRef<HTMLAudioElement | null>(null);
  const redzoneBgmRef = useRef<HTMLAudioElement | null>(null);
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
  const poemPulseTimeoutRef = useRef<number | null>(null);
  const poemSweepTimeoutRef = useRef<number | null>(null);
  const introHideTimeoutRef = useRef<number | null>(null);
  const systemSwitchTimeoutRef = useRef<number | null>(null);

  const normalizedDatabase = useMemo<NormalizedEntry[]>(() => {
    return (intelDatabase as IntelEntry[]).map((item) => ({
      ...item,
      normalizedCode: item.code.trim().toUpperCase(),
    }));
  }, []);

  const intelDatabaseEntries = useMemo(
    () => normalizedDatabase.filter((item) => item.classification !== "마물"),
    [normalizedDatabase]
  );

  const redzoneDatabaseEntries = useMemo(
    () => normalizedDatabase.filter((item) => item.classification === "마물"),
    [normalizedDatabase]
  );

  const activeDatabase = systemMode === "redzone" ? redzoneDatabaseEntries : intelDatabaseEntries;
  const activeBootLines = transitionTarget === "redzone" ? redzoneBootLines : intelBootLines;

  const isPoemTheme = themeMode === "poem";
  const isRedzoneTheme = themeMode === "redzone";
  const showIntroOverlay = introVisible;
  const showTransitionOverlay = transitionVisible;

  const safePlay = (audio: HTMLAudioElement | null, reset = false) => {
    if (!audio) return;
    try {
      if (reset) audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } catch {
      // noop
    }
  };

  const getBgmByMode = (mode: ThemeMode) => {
    if (mode === "poem") return poemBgmRef.current;
    if (mode === "redzone") return redzoneBgmRef.current;
    return bgmRef.current;
  };

  const stopAllBgm = (except?: HTMLAudioElement | null) => {
    [bgmRef.current, poemBgmRef.current, redzoneBgmRef.current].forEach((audio) => {
      if (!audio || audio === except) return;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // noop
      }
    });
  };

  const startBgmForMode = (mode: ThemeMode, forceRestart = false) => {
    const target = getBgmByMode(mode);
    if (!target) return;

    try {
      target.loop = true;

      const isAlreadyPlaying = !target.paused && !target.ended && target.currentTime > 0;

      stopAllBgm(target);

      if (isAlreadyPlaying && !forceRestart) {
        return;
      }

      if (forceRestart) {
        target.currentTime = 0;
      }

      target.play().catch(() => {});
    } catch {
      // noop
    }
  };

  const playClick = () => {
    if (!clickSoundRef.current) return;
    try {
      clickSoundRef.current.currentTime = 0;
      clickSoundRef.current.play().catch(() => {});
    } catch {
      // noop
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
      // noop
    }
  };

  const getHistoryStorageKey = (mode: SystemMode) => HISTORY_STORAGE_KEYS[mode];

  const loadHistory = (mode: SystemMode) => {
    try {
      const raw = localStorage.getItem(getHistoryStorageKey(mode));
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

  const saveHistory = (mode: SystemMode, nextHistory: HistoryItem[]) => {
    try {
      localStorage.setItem(getHistoryStorageKey(mode), JSON.stringify(nextHistory));
    } catch {
      // noop
    }
  };

  const addHistory = (entry: IntelEntry, mode: SystemMode) => {
    setHistory((prev) => {
      const normalizedCode = entry.code.trim().toUpperCase();
      const next: HistoryItem[] = [
        {
          code: normalizedCode,
          title: entry.title,
          openedAt: Date.now(),
        },
        ...prev.filter((item) => item.code !== normalizedCode),
      ].slice(0, MAX_HISTORY);

      saveHistory(mode, next);
      return next;
    });
  };

  const clearHistory = () => {
    playClick();
    setHistory([]);
    try {
      localStorage.removeItem(getHistoryStorageKey(systemMode));
    } catch {
      // noop
    }
    setStatusText(systemMode === "redzone" ? "적경국 열람 기록이 삭제되었습니다." : "열람 기록이 삭제되었습니다.");
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

  const triggerPoemPulse = () => {
    setPoemPulse(true);
    setPoemSweep(true);

    if (poemPulseTimeoutRef.current) {
      window.clearTimeout(poemPulseTimeoutRef.current);
    }
    if (poemSweepTimeoutRef.current) {
      window.clearTimeout(poemSweepTimeoutRef.current);
    }

    poemPulseTimeoutRef.current = window.setTimeout(() => {
      setPoemPulse(false);
      poemPulseTimeoutRef.current = null;
    }, 700);

    poemSweepTimeoutRef.current = window.setTimeout(() => {
      setPoemSweep(false);
      poemSweepTimeoutRef.current = null;
    }, 950);
  };

  const resetTransientStates = () => {
    stopDeniedAlarm();

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (openDocumentTimeoutRef.current) {
      window.clearTimeout(openDocumentTimeoutRef.current);
      openDocumentTimeoutRef.current = null;
    }

    if (poemPulseTimeoutRef.current) {
      window.clearTimeout(poemPulseTimeoutRef.current);
      poemPulseTimeoutRef.current = null;
    }

    if (poemSweepTimeoutRef.current) {
      window.clearTimeout(poemSweepTimeoutRef.current);
      poemSweepTimeoutRef.current = null;
    }

    setPoemPulse(false);
    setPoemSweep(false);
    setDisplayedText("");
    setSelectedIntel(null);
  };

  const openDocument = (entry: IntelEntry, mode: SystemMode) => {
    resetTransientStates();
    setStatusText("접근 승인됨...");
    safePlay(openSoundRef.current, true);

    const nextTheme = getSystemTheme(mode, entry);
    setThemeMode(nextTheme);

    if (nextTheme === "poem") {
      triggerPoemPulse();
    }

    startBgmForMode(nextTheme);

    openDocumentTimeoutRef.current = window.setTimeout(() => {
      setSelectedIntel(entry);
      setInputCode(entry.code.trim().toUpperCase());
      setStatusText(entry.title + " 문서 열람 중");
      addHistory(entry, mode);
    }, 500);
  };

  const switchSystem = (target: SystemMode) => {
    if (target === systemMode) return;

    resetTransientStates();
    setTransitionTarget(target);
    setVisibleBootLines([]);
    setTransitionVisible(true);
    setInputCode("");
    setStatusText(target === "redzone" ? "접속중..." : "정보체계 접속중...");
    safePlay(bootSoundRef.current, true);

    if (target === "redzone") {
      setThemeMode("redzone");
      startBgmForMode("redzone");
    } else {
      setThemeMode("normal");
      startBgmForMode("normal");
    }

    if (systemSwitchTimeoutRef.current) {
      window.clearTimeout(systemSwitchTimeoutRef.current);
      systemSwitchTimeoutRef.current = null;
    }

    systemSwitchTimeoutRef.current = window.setTimeout(() => {
      setSystemMode(target);
      setHistory(loadHistory(target));
      setTransitionVisible(false);
      setTransitionTarget(null);
      setStatusText(
        target === "redzone"
          ? "적경국 접속 승인됨. 코드 입력 대기 중."
          : "접근 승인됨. 코드 입력 대기 중."
      );
      systemSwitchTimeoutRef.current = null;
    }, 2200);
    if (target === "redzone") {
  setRedzoneUnlocked(true);
  try {
    localStorage.setItem("redzone_unlocked_v1", "true");
  } catch {
    // noop
  }
}
  };

  useEffect(() => {
    setHistory(loadHistory(systemMode));
  }, [systemMode]);

  useEffect(() => {
    bgmRef.current = new Audio("/sounds/bgm.mp3");
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.22;
    bgmRef.current.preload = "auto";

    poemBgmRef.current = new Audio("/sounds/p0em.mp3");
    poemBgmRef.current.loop = true;
    poemBgmRef.current.volume = 0.26;
    poemBgmRef.current.preload = "auto";

    redzoneBgmRef.current = new Audio("/sounds/redzone.mp3");
    redzoneBgmRef.current.loop = true;
    redzoneBgmRef.current.volume = 0.25;
    redzoneBgmRef.current.preload = "auto";

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
      safePlay(bootSoundRef.current, true);
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);

      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      if (openDocumentTimeoutRef.current) window.clearTimeout(openDocumentTimeoutRef.current);
      if (poemPulseTimeoutRef.current) window.clearTimeout(poemPulseTimeoutRef.current);
      if (poemSweepTimeoutRef.current) window.clearTimeout(poemSweepTimeoutRef.current);
      if (introHideTimeoutRef.current) window.clearTimeout(introHideTimeoutRef.current);
      if (systemSwitchTimeoutRef.current) window.clearTimeout(systemSwitchTimeoutRef.current);
      if (deniedLoopRef.current) window.clearInterval(deniedLoopRef.current);

      [
        bgmRef.current,
        poemBgmRef.current,
        redzoneBgmRef.current,
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
          // noop
        }
      });
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let flowIndex = 0;

    const lineTimer = window.setInterval(() => {
      if (!mounted) return;

      setVisibleBootLines((prev) => {
        const next = [...prev, intelBootLines[flowIndex % intelBootLines.length]];
        flowIndex += 1;
        return next.slice(-16);
      });

      if (Math.random() > 0.82) {
        setGlitch(true);
        window.setTimeout(() => setGlitch(false), 55);
      }
    }, 215);

    const collapseTimer = window.setTimeout(() => {
      if (!mounted) return;
      setBootStage("collapse");
      safePlay(bootSoundRef.current, true);
    }, 2550);

    const rebootTimer = window.setTimeout(() => {
      if (!mounted) return;
      setBootStage("reboot");
    }, 3220);

    const readyTimer = window.setTimeout(() => {
      if (!mounted) return;
      setBootStage("ready");
      setStatusText("접근 승인됨. 코드 입력 대기 중.");
      startBgmForMode("normal");
    }, 4050);

    return () => {
      mounted = false;
      window.clearInterval(lineTimer);
      window.clearTimeout(collapseTimer);
      window.clearTimeout(rebootTimer);
      window.clearTimeout(readyTimer);
    };
  }, []);

  useEffect(() => {
    if (bootStage !== "ready") return;

    introHideTimeoutRef.current = window.setTimeout(() => {
      setIntroVisible(false);
      introHideTimeoutRef.current = null;
    }, 520);

    return () => {
      if (introHideTimeoutRef.current) {
        window.clearTimeout(introHideTimeoutRef.current);
        introHideTimeoutRef.current = null;
      }
    };
  }, [bootStage]);

  useEffect(() => {
    if (!transitionVisible) return;

    let flowIndex = 0;
    setVisibleBootLines([]);

    const lineTimer = window.setInterval(() => {
      setVisibleBootLines((prev) => {
        const next = [...prev, activeBootLines[flowIndex % activeBootLines.length]];
        flowIndex += 1;
        return next.slice(-14);
      });

      if (Math.random() > 0.75) {
        setGlitch(true);
        window.setTimeout(() => setGlitch(false), 60);
      }
    }, 140);

    return () => {
      window.clearInterval(lineTimer);
    };
  }, [transitionVisible, activeBootLines]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (Math.random() > 0.94) {
        setGlitch(true);
        setScreenFlicker(true);

        window.setTimeout(() => setGlitch(false), 70);
        window.setTimeout(() => setScreenFlicker(false), 45);
      }
    }, 1700);

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
    const isPoem = selectedIntel.code.trim().toUpperCase() === POEM_CODE;

    setDisplayedText("");

    const poemTargetDuration = 26000;
    const poemStartDelay = 1800;
    const poemEndingDelay = 1200;
    const poemPlayable = poemTargetDuration - poemStartDelay - poemEndingDelay;
    const poemStartTime = Date.now();

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
        (Math.random() > 0.5 || charIndex % 4 === 0);

      if (shouldPlayTyping) {
        playTypingSound();
      }

      if (charIndex >= fullText.length) {
        typingTimeoutRef.current = null;
        return;
      }

      let nextDelay = 16;

      if (isPoem) {
        const elapsed = Date.now() - poemStartTime;
        const remainingChars = Math.max(1, fullText.length - charIndex);
        const remainingTime = Math.max(100, poemPlayable - elapsed);

        let base = remainingTime / remainingChars;

        if (currentChar === "\n") {
          base *= 3.6;
        } else if (
          currentChar === "." ||
          currentChar === "," ||
          currentChar === "!" ||
          currentChar === "?" ||
          currentChar === "…"
        ) {
          base *= 2.25;
        } else if (currentChar === " ") {
          base *= 0.72;
        }

        if (Math.random() < 0.14) {
          base += 200 + Math.random() * 300;
        }

        nextDelay = base;
      } else {
        nextDelay =
          currentChar === "\n"
            ? 55 + Math.random() * 35
            : currentChar === "." ||
              currentChar === "," ||
              currentChar === "!" ||
              currentChar === "?"
            ? 45 + Math.random() * 40
            : 14 + Math.random() * 18;
      }

      typingTimeoutRef.current = window.setTimeout(typeNext, nextDelay);
    };

    typingTimeoutRef.current = window.setTimeout(typeNext, isPoem ? 1800 : 120);

    return () => {
      cancelled = true;
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [selectedIntel]);

  const handleSubmit = () => {
    playClick();

    const code = inputCode.trim().toUpperCase();

    if (!code) {
      setStatusText("코드를 입력하세요.");
      return;
    }

    if (systemMode === "intel" && code === REDZONE_GATE_CODE) {
      switchSystem("redzone");
      return;
    }

    const found = activeDatabase.find((item) => item.normalizedCode === code);

    if (found) {
      openDocument(found, systemMode);
      return;
    }

    if (systemMode === "intel") {
      const monsterFound = redzoneDatabaseEntries.find((item) => item.normalizedCode === code);
      if (monsterFound) {
        setStatusText("해당 기록은 적경국 전용입니다. r3dz0ne으로 접속하십시오.");
        startDeniedAlarm();
        return;
      }
    }

    resetTransientStates();
    setThemeMode(systemMode === "redzone" ? "redzone" : "normal");
    startBgmForMode(systemMode === "redzone" ? "redzone" : "normal");
    setStatusText("ACCESS DENIED");
    startDeniedAlarm();
  };

  const handleReset = () => {
    playClick();
    resetTransientStates();
    setInputCode("");
    setThemeMode(systemMode === "redzone" ? "redzone" : "normal");
    startBgmForMode(systemMode === "redzone" ? "redzone" : "normal");
    setStatusText(systemMode === "redzone" ? "적경국 대기 중. 접근 코드를 입력하세요." : "대기 중. 접근 코드를 입력하세요.");
    safePlay(closeSoundRef.current, true);
  };

  const handleOpenFromHistory = (code: string) => {
    playClick();

    const found = activeDatabase.find((item) => item.normalizedCode === code);

    if (!found) {
      setStatusText("기록된 문서를 현재 데이터베이스에서 찾을 수 없습니다.");
      return;
    }

    openDocument(found, systemMode);
  };

  const topTitle = isRedzoneTheme
    ? "NEW SAN DIEGO BUREAU OF RED ZONE DEFENSE"
    : "NEW SAN DIEGO INTELLIGENCE AGENCY";
  const topLogoSrc = isRedzoneTheme ? "/redzone-logo.png" : "logo.png";
  const bottomLabel = "뉴 샌디에이고 데이터 체계";
  const historyTitle = isRedzoneTheme ? "RED ZONE ACCESS LOG" : "RECENT ACCESS LOG";
  const switchButtonLabel = isRedzoneTheme ? "정보체계로" : "적경국 접속";

  const backgroundStyle = isRedzoneTheme
    ? "linear-gradient(180deg, #190609 0%, #27090d 18%, #3a0d11 38%, #5a1117 64%, #110204 100%)"
    : isPoemTheme
    ? "linear-gradient(180deg, #35172f 0%, #542445 26%, #7e3b6c 52%, #c26ea1 76%, #ffd2e9 100%)"
    : "linear-gradient(180deg, #06111f 0%, #040b14 100%)";

  return (
    <div
      style={{
        position: "relative",
        background: backgroundStyle,
        minHeight: "100vh",
        color: "#ffffff",
        padding: showIntroOverlay ? "0" : "20px 14px 40px",
        fontFamily: "monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxSizing: "border-box",
        overflow: "hidden",
        transition: "background 1.1s ease, filter 0.35s ease, transform 0.2s ease, padding 0.55s ease",
        filter: poemPulse
          ? "brightness(1.2) saturate(1.2) hue-rotate(-8deg)"
          : isPoemTheme
          ? "brightness(1.06) saturate(1.08)"
          : isRedzoneTheme
          ? "brightness(1.02) saturate(1.06)"
          : "none",
        transform: poemPulse ? "scale(1.005)" : "scale(1)",
      }}
    >
      {showIntroOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            background: "#03070d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            opacity: bootStage === "ready" ? 0 : 1,
            transform: bootStage === "ready" ? "scale(1.01)" : "scale(1)",
            transition: "opacity 0.55s ease, transform 0.55s ease",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 45%, rgba(160,205,255,0.1) 0%, rgba(80,140,220,0.06) 18%, rgba(0,0,0,0) 55%)",
              opacity: bootStage === "collapse" ? 0.28 : 1,
              transition: "opacity 0.28s ease",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.09,
              background:
                "repeating-linear-gradient(to bottom, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 2px, transparent 5px)",
              mixBlendMode: "screen",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.14) 0 1px, transparent 1px), radial-gradient(circle at 80% 35%, rgba(255,255,255,0.1) 0 1px, transparent 1px), radial-gradient(circle at 45% 70%, rgba(255,255,255,0.12) 0 1px, transparent 1px)",
              backgroundSize: "140px 140px, 180px 180px, 160px 160px",
              animation: "noiseMoveSoft 1.6s linear infinite",
              opacity: 0.035,
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              height: bootStage === "collapse" ? "3px" : "100%",
              transform:
                bootStage === "collapse"
                  ? "translateY(-50%) scaleY(1) scaleX(0.18)"
                  : bootStage === "reboot"
                  ? "translateY(-50%) scaleY(1) scaleX(1)"
                  : "translateY(-50%) scaleY(1) scaleX(1)",
              opacity: bootStage === "collapse" ? 0.9 : bootStage === "reboot" ? 0.72 : 1,
              transition:
                "transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), height 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.26s ease",
              boxShadow:
                bootStage === "collapse"
                  ? "0 0 12px rgba(180,230,255,0.7), 0 0 28px rgba(120,180,255,0.4)"
                  : "none",
              background:
                bootStage === "collapse"
                  ? "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.75) 18%, rgba(145,205,255,0.88) 50%, rgba(255,255,255,0.75) 82%, transparent 100%)"
                  : "transparent",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "980px",
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform:
                bootStage === "collapse"
                  ? "scaleY(0.14) scaleX(0.98)"
                  : bootStage === "reboot"
                  ? "scaleY(1.02) scaleX(1.005)"
                  : "scale(1)",
              opacity: bootStage === "collapse" ? 0.58 : bootStage === "reboot" ? 0.94 : 1,
              transition:
                "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease",
              filter: glitch ? "contrast(1.1) brightness(1.05) saturate(0.98)" : "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  width: "min(780px, 92vw)",
                  height: "min(420px, 58vh)",
                  position: "relative",
                  overflow: "hidden",
                  maskImage: "radial-gradient(circle at center, black 52%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(circle at center, black 52%, transparent 100%)",
                }}
              >
                {visibleBootLines.map((line, index) => {
                  const row = index % 9;
                  const leftBase = (index * 11) % 70;
                  return (
                    <div
                      key={`${line}-${index}`}
                      style={{
                        position: "absolute",
                        left: `${leftBase}%`,
                        top: `${10 + row * 10}%`,
                        whiteSpace: "nowrap",
                        color:
                          index % 2 === 0 ? "rgba(175,215,255,0.2)" : "rgba(255,255,255,0.1)",
                        fontSize: row % 2 === 0 ? "13px" : "12px",
                        letterSpacing: "1px",
                        textShadow: "0 0 8px rgba(130,185,255,0.1)",
                        animation: `bootFlow ${4.2 + (index % 4) * 0.55}s linear forwards`,
                      }}
                    >
                      &gt; {line}
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "18px",
                opacity: bootStage === "collapse" ? 0.8 : 1,
                transition: "opacity 0.28s ease",
              }}
            >
              <img
                src="logo.png"
                alt="agency logo"
                style={{
                  width: "min(180px, 42vw)",
                  filter: "brightness(1.2) drop-shadow(0 0 12px rgba(160,220,255,0.18))",
                  transform: glitch ? "translateX(1px)" : "none",
                  transition: "transform 0.08s linear",
                }}
              />
              <div
                style={{
                  fontSize: "clamp(16px, 2.8vw, 22px)",
                  letterSpacing: "5px",
                  textAlign: "center",
                  color: "#eef6ff",
                  textShadow: glitch
                    ? "1px 0 rgba(255,0,70,0.18), -1px 0 rgba(80,180,255,0.18)"
                    : "0 0 12px rgba(170,220,255,0.12)",
                }}
              >
                NEW SAN DIEGO INTELLIGENCE AGENCY
              </div>
            </div>
          </div>
        </div>
      )}

      {showTransitionOverlay && !showIntroOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 18,
            background:
              transitionTarget === "redzone"
                ? "radial-gradient(circle at 50% 40%, rgba(145,18,28,0.16) 0%, rgba(10,2,4,0.96) 56%, #040102 100%)"
                : "radial-gradient(circle at 50% 40%, rgba(26,96,180,0.12) 0%, rgba(4,10,18,0.94) 56%, #02060a 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.1,
              background:
                "repeating-linear-gradient(to bottom, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 2px, transparent 5px)",
              mixBlendMode: "screen",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                transitionTarget === "redzone"
                  ? "radial-gradient(circle at 20% 20%, rgba(255,120,120,0.16) 0 1px, transparent 1px), radial-gradient(circle at 80% 35%, rgba(255,255,255,0.08) 0 1px, transparent 1px), radial-gradient(circle at 45% 70%, rgba(255,130,130,0.12) 0 1px, transparent 1px)"
                  : "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.14) 0 1px, transparent 1px), radial-gradient(circle at 80% 35%, rgba(255,255,255,0.1) 0 1px, transparent 1px), radial-gradient(circle at 45% 70%, rgba(255,255,255,0.12) 0 1px, transparent 1px)",
              backgroundSize: "140px 140px, 180px 180px, 160px 160px",
              animation: "noiseMoveSoft 1.2s linear infinite",
              opacity: 0.06,
            }}
          />

          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "980px",
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              filter: glitch ? "contrast(1.08) brightness(1.05)" : "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  width: "min(760px, 92vw)",
                  height: "min(420px, 58vh)",
                  position: "relative",
                  overflow: "hidden",
                  maskImage: "radial-gradient(circle at center, black 52%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(circle at center, black 52%, transparent 100%)",
                }}
              >
                {visibleBootLines.map((line, index) => {
                  const row = index % 8;
                  const leftBase = (index * 13) % 72;
                  return (
                    <div
                      key={`switch-${line}-${index}`}
                      style={{
                        position: "absolute",
                        left: `${leftBase}%`,
                        top: `${12 + row * 10}%`,
                        whiteSpace: "nowrap",
                        color:
                          transitionTarget === "redzone"
                            ? index % 2 === 0
                              ? "rgba(255,120,120,0.24)"
                              : "rgba(255,220,220,0.1)"
                            : index % 2 === 0
                            ? "rgba(175,215,255,0.2)"
                            : "rgba(255,255,255,0.1)",
                        fontSize: row % 2 === 0 ? "13px" : "12px",
                        letterSpacing: "1px",
                        textShadow:
                          transitionTarget === "redzone"
                            ? "0 0 8px rgba(255,80,80,0.12)"
                            : "0 0 8px rgba(130,185,255,0.1)",
                        animation: `bootFlow ${3.1 + (index % 4) * 0.35}s linear forwards`,
                      }}
                    >
                      &gt; {line}
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "18px",
              }}
            >
              <img
                src={transitionTarget === "redzone" ? "/redzone-logo.png" : "logo.png"}
                alt="system logo"
                style={{
                  width: "min(190px, 42vw)",
                  filter:
                    transitionTarget === "redzone"
                      ? "brightness(1.16) drop-shadow(0 0 16px rgba(255,70,70,0.22))"
                      : "brightness(1.2) drop-shadow(0 0 12px rgba(160,220,255,0.18))",
                }}
              />
              <div
                style={{
                  fontSize: "clamp(16px, 2.8vw, 22px)",
                  letterSpacing: "5px",
                  textAlign: "center",
                  color: transitionTarget === "redzone" ? "#ffd7d7" : "#eef6ff",
                  textShadow:
                    transitionTarget === "redzone"
                      ? "0 0 12px rgba(255,110,110,0.18)"
                      : "0 0 12px rgba(170,220,255,0.12)",
                }}
              >
                {transitionTarget === "redzone"
                  ? "NEW SAN DIEGO BUREAU OF RED ZONE DEFENSE"
                  : "NEW SAN DIEGO INTELLIGENCE AGENCY"}
              </div>
              <div
                style={{
                  color: transitionTarget === "redzone" ? "#ffb0b0" : "#bcd4ff",
                  fontSize: "14px",
                  letterSpacing: "2px",
                }}
              >
                {transitionTarget === "redzone" ? "접속중..." : "정보체계 접속중..."}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          opacity: isPoemTheme ? 0.24 : isRedzoneTheme ? 0.18 : 0,
          background: isPoemTheme
            ? poemPulse
              ? "radial-gradient(circle at 50% 45%, rgba(255,244,250,0.5) 0%, rgba(255,185,225,0.22) 24%, rgba(255,150,215,0.08) 45%, transparent 72%)"
              : "radial-gradient(circle at 50% 45%, rgba(255,244,250,0.24) 0%, rgba(255,185,225,0.12) 28%, transparent 72%)"
            : "radial-gradient(circle at 50% 42%, rgba(255,100,110,0.18) 0%, rgba(255,50,60,0.07) 30%, transparent 70%)",
          transition: "opacity 0.35s ease, background 0.3s ease",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          opacity: poemSweep ? 0.34 : isRedzoneTheme ? 0.1 : 0,
          background: isPoemTheme
            ? "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 18%, rgba(255,210,235,0.24) 48%, rgba(255,255,255,0.16) 78%, transparent 100%)"
            : "linear-gradient(90deg, transparent 0%, rgba(255,80,80,0.08) 22%, rgba(255,210,210,0.12) 48%, rgba(255,80,80,0.08) 74%, transparent 100%)",
          transform: poemSweep
            ? "translateX(0%) skewX(-14deg)"
            : isRedzoneTheme
            ? "translateX(-24%) skewX(-12deg)"
            : "translateX(-120%) skewX(-14deg)",
          transition: "transform 0.8s ease, opacity 0.38s ease",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          opacity: isPoemTheme ? 0.1 : isRedzoneTheme ? 0.06 : 0,
          backgroundImage: isPoemTheme
            ? `
              radial-gradient(circle at 12% 20%, rgba(255,255,255,0.2) 0 2px, transparent 3px),
              radial-gradient(circle at 85% 30%, rgba(255,220,238,0.18) 0 2px, transparent 3px),
              radial-gradient(circle at 35% 78%, rgba(255,210,235,0.14) 0 2px, transparent 3px),
              radial-gradient(circle at 70% 88%, rgba(255,240,248,0.1) 0 2px, transparent 3px)
            `
            : `
              radial-gradient(circle at 20% 18%, rgba(255,140,140,0.12) 0 1px, transparent 1px),
              radial-gradient(circle at 82% 35%, rgba(255,180,180,0.08) 0 1px, transparent 1px),
              radial-gradient(circle at 42% 74%, rgba(255,120,120,0.1) 0 1px, transparent 1px)
            `,
          backgroundSize: "220px 220px, 260px 260px, 240px 240px, 300px 300px",
          animation: isPoemTheme ? "petalFloat 12s linear infinite" : isRedzoneTheme ? "noiseMoveSoft 3.2s linear infinite" : "none",
          transition: "opacity 0.4s ease",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: "980px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: glitch ? `translateX(1px) ${poemPulse ? "skewX(-0.5deg)" : ""}` : poemPulse ? "translateY(-1px)" : "none",
          filter: glitch
            ? isPoemTheme
              ? "contrast(1.08) brightness(1.07) saturate(1.1)"
              : isRedzoneTheme
              ? "contrast(1.06) brightness(1.04) saturate(1.08)"
              : "contrast(1.08) brightness(1.04) saturate(0.98)"
            : "none",
          opacity: screenFlicker ? 0.975 : 1,
          transition: "transform 0.08s linear, opacity 0.08s linear, filter 0.08s linear",
          paddingTop: showIntroOverlay ? "0" : "8px",
        }}
      >
        {!showIntroOverlay && (
          <>
            <h2
              style={{
                color: "#ffffff",
                letterSpacing: "2px",
                textAlign: "center",
                margin: "8px 0 0",
                fontSize: "clamp(18px, 4vw, 28px)",
                textShadow: glitch
                  ? isPoemTheme
                    ? "1px 0 rgba(255,180,220,0.25), -1px 0 rgba(255,245,250,0.18)"
                    : isRedzoneTheme
                    ? "1px 0 rgba(255,100,100,0.22), -1px 0 rgba(255,210,210,0.16)"
                    : "1px 0 rgba(255,0,70,0.2), -1px 0 rgba(80,180,255,0.2)"
                  : isPoemTheme
                  ? "0 0 14px rgba(255, 210, 235, 0.14)"
                  : isRedzoneTheme
                  ? "0 0 12px rgba(255, 90, 90, 0.12)"
                  : "0 0 10px rgba(180,220,255,0.05)",
              }}
            >
              {topTitle}
            </h2>

            <div
              style={{
                marginTop: "22px",
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
                  startBgmForMode(themeMode);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                placeholder={isRedzoneTheme ? "적경국 코드 입력" : "코드 입력"}
                style={{
                  flex: "1 1 240px",
                  minWidth: "0",
                  maxWidth: "420px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: isPoemTheme
                    ? "1px solid rgba(255, 220, 240, 0.28)"
                    : isRedzoneTheme
                    ? "1px solid rgba(255, 140, 140, 0.26)"
                    : "1px solid rgba(160, 200, 255, 0.2)",
                  background: isPoemTheme
                    ? "rgba(72, 31, 60, 0.95)"
                    : isRedzoneTheme
                    ? "rgba(32, 9, 12, 0.95)"
                    : "rgba(8, 18, 32, 0.95)",
                  color: "#ffffff",
                  outline: "none",
                  fontFamily: "monospace",
                  fontSize: "15px",
                  boxSizing: "border-box",
                  boxShadow: isPoemTheme
                    ? "inset 0 0 16px rgba(255, 215, 236, 0.08)"
                    : isRedzoneTheme
                    ? "inset 0 0 14px rgba(255, 90, 90, 0.08)"
                    : "inset 0 0 10px rgba(0,0,0,0.28)",
                }}
              />

              <button
                onClick={handleSubmit}
                style={{
                  padding: "12px 18px",
                  borderRadius: "10px",
                  border: isPoemTheme
                    ? "1px solid rgba(255, 220, 240, 0.28)"
                    : isRedzoneTheme
                    ? "1px solid rgba(255, 140, 140, 0.25)"
                    : "1px solid rgba(160, 200, 255, 0.25)",
                  background: isPoemTheme ? "#8d4a79" : isRedzoneTheme ? "#4e1117" : "#0f2340",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: "14px",
                  boxShadow: "0 0 12px rgba(0,0,0,0.18)",
                }}
              >
                확인
              </button>

              {!selectedIntel && (isRedzoneTheme || redzoneUnlocked) && (
  <button
    onClick={() => {
      playClick();
      if (isRedzoneTheme) switchSystem("intel");
      else switchSystem("redzone");
    }}
    style={{
      padding: "12px 18px",
      borderRadius: "10px",
      border: isRedzoneTheme
        ? "1px solid rgba(255, 220, 220, 0.16)"
        : "1px solid rgba(255, 255, 255, 0.15)",
      background: isRedzoneTheme ? "#241012" : "#142233",
      color: isRedzoneTheme ? "#ffe4e4" : "#dfeeff",
      cursor: "pointer",
      fontFamily: "monospace",
      fontSize: "14px",
      boxShadow: "0 0 12px rgba(0,0,0,0.18)",
    }}
  >
    {switchButtonLabel}
  </button>
)}

              {selectedIntel && (
                <button
                  onClick={handleReset}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "10px",
                    border: isPoemTheme
                      ? "1px solid rgba(255, 235, 245, 0.22)"
                      : isRedzoneTheme
                      ? "1px solid rgba(255, 220, 220, 0.16)"
                      : "1px solid rgba(255, 255, 255, 0.15)",
                    background: isPoemTheme ? "#63324f" : isRedzoneTheme ? "#2a1115" : "#122b1d",
                    color: isPoemTheme ? "#fff0f8" : isRedzoneTheme ? "#ffe9e9" : "#dfffe8",
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

            <div
              style={{
                marginTop: "12px",
                color: isDenied
                  ? "#ff5252"
                  : statusText === "ACCESS DENIED"
                  ? "#ff9494"
                  : isPoemTheme
                  ? "#ffe5f3"
                  : isRedzoneTheme
                  ? "#ffcccc"
                  : "#bcd4ff",
                fontSize: "14px",
                textAlign: "center",
                letterSpacing: "0.5px",
                minHeight: "22px",
                wordBreak: "break-word",
                animation: isDenied ? "deniedFlashSoft 0.55s infinite" : "none",
                textShadow: isDenied
                  ? "0 0 8px rgba(255, 0, 0, 0.25)"
                  : isPoemTheme
                  ? "0 0 10px rgba(255, 215, 235, 0.14)"
                  : isRedzoneTheme
                  ? "0 0 10px rgba(255, 90, 90, 0.14)"
                  : "none",
              }}
            >
              {statusText}
            </div>

            {!selectedIntel && (
              <>
                <div
                  style={{
                    marginTop: "64px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    opacity: 0.9,
                    textAlign: "center",
                  }}
                >
                  <img
                    src={topLogoSrc}
                    alt="agency logo"
                    style={{
                      width: "min(160px, 42vw)",
                      marginBottom: "20px",
                      filter: isPoemTheme
                        ? "brightness(1.28) drop-shadow(0 0 14px rgba(255,210,235,0.2))"
                        : isRedzoneTheme
                        ? "brightness(1.14) drop-shadow(0 0 14px rgba(255, 90, 90, 0.16))"
                        : "brightness(1.14)",
                    }}
                  />

                  <div
                    style={{
                      fontSize: "14px",
                      letterSpacing: "3px",
                      color: isPoemTheme ? "#ffe6f3" : isRedzoneTheme ? "#ffc7c7" : "#bcd4ff",
                      wordBreak: "break-word",
                      textShadow: isPoemTheme
                        ? "0 0 10px rgba(255, 210, 235, 0.14)"
                        : isRedzoneTheme
                        ? "0 0 10px rgba(255, 110, 110, 0.1)"
                        : "none",
                    }}
                  >
                    {bottomLabel}
                  </div>
                </div>

                <div
                  style={{
                    width: "100%",
                    marginTop: "24px",
                    background: isPoemTheme
                      ? "rgba(86, 38, 72, 0.86)"
                      : isRedzoneTheme
                      ? "rgba(30, 10, 12, 0.88)"
                      : "rgba(9, 19, 33, 0.84)",
                    border: isPoemTheme
                      ? "1px solid rgba(255, 220, 240, 0.18)"
                      : isRedzoneTheme
                      ? "1px solid rgba(255, 140, 140, 0.16)"
                      : "1px solid rgba(160, 200, 255, 0.16)",
                    borderRadius: "14px",
                    padding: "16px",
                    boxSizing: "border-box",
                    boxShadow: isPoemTheme
                      ? "0 0 24px rgba(255, 180, 220, 0.08)"
                      : isRedzoneTheme
                      ? "0 0 24px rgba(120, 10, 18, 0.16)"
                      : "0 0 20px rgba(0, 0, 0, 0.2)",
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
                        color: isPoemTheme ? "#ffd4ea" : isRedzoneTheme ? "#ffb5b5" : "#9ec2ff",
                        fontSize: "13px",
                        letterSpacing: "1.3px",
                      }}
                    >
                      {historyTitle}
                    </div>

                    <button
                      onClick={clearHistory}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: isPoemTheme
                          ? "rgba(120,45,80,0.72)"
                          : isRedzoneTheme
                          ? "rgba(96,22,28,0.8)"
                          : "rgba(70,20,20,0.7)",
                        color: isPoemTheme ? "#ffe7f3" : "#ffd0d0",
                        cursor: "pointer",
                        fontFamily: "monospace",
                        fontSize: "12px",
                      }}
                    >
                      기록 삭제
                    </button>
                  </div>

                  <div
                    style={{
                      marginBottom: "12px",
                      color: isPoemTheme ? "#ffe5f3" : isRedzoneTheme ? "#ffd9d9" : "#bcd4ff",
                      fontSize: "12px",
                      letterSpacing: "0.8px",
                      lineHeight: "1.6",
                    }}
                  >
                    열람한 기록: <span style={{ color: "#ffffff" }}>{history.length}</span>
                    {" / "}
                    현재 존재하는 기록:{" "}
                    <span style={{ color: isPoemTheme ? "#ffd4ea" : isRedzoneTheme ? "#ffb5b5" : "#9ec2ff" }}>
                      {activeDatabase.length}
                    </span>
                  </div>

                  {history.length === 0 ? (
                    <div
                      style={{
                        color: isPoemTheme ? "#f4d8e8" : isRedzoneTheme ? "#d7b6b6" : "#8ea8cf",
                        fontSize: "13px",
                        lineHeight: "1.7",
                      }}
                    >
                      {isRedzoneTheme
                        ? "아직 이 기기에서 열람한 적경국 문서 기록이 없습니다."
                        : "아직 이 기기에서 열람한 문서 기록이 없습니다."}
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
                            background: isPoemTheme
                              ? "rgba(62, 26, 50, 0.94)"
                              : isRedzoneTheme
                              ? "rgba(26, 9, 11, 0.94)"
                              : "rgba(6, 14, 26, 0.92)",
                            border: isPoemTheme
                              ? "1px solid rgba(255, 220, 240, 0.14)"
                              : isRedzoneTheme
                              ? "1px solid rgba(255, 150, 150, 0.14)"
                              : "1px solid rgba(160, 200, 255, 0.14)",
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
                                color: isPoemTheme ? "#f2cbe0" : isRedzoneTheme ? "#d9aaaa" : "#8ea8cf",
                              }}
                            >
                              {formatOpenedTime(item.openedAt)}
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: "6px",
                              fontSize: "12px",
                              color: isPoemTheme ? "#ffd4ea" : isRedzoneTheme ? "#ffb5b5" : "#9ec2ff",
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
              </>
            )}

            {selectedIntel && (
              <div
                style={{
                  marginTop: "26px",
                  width: "100%",
                  background: isPoemTheme
                    ? "rgba(90, 42, 74, 0.9)"
                    : isRedzoneTheme
                    ? "rgba(28, 9, 11, 0.92)"
                    : "rgba(9, 19, 33, 0.9)",
                  border: isPoemTheme
                    ? "1px solid rgba(255, 220, 240, 0.22)"
                    : isRedzoneTheme
                    ? "1px solid rgba(255, 150, 150, 0.18)"
                    : "1px solid rgba(160, 200, 255, 0.18)",
                  borderRadius: "14px",
                  padding: "18px",
                  boxSizing: "border-box",
                  boxShadow: isPoemTheme
                    ? "0 0 30px rgba(255, 180, 225, 0.1)"
                    : isRedzoneTheme
                    ? "0 0 30px rgba(120, 12, 22, 0.18)"
                    : "0 0 24px rgba(0, 0, 0, 0.3)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: isPoemTheme
                      ? "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 24%, transparent 76%, rgba(255,255,255,0.025) 100%)"
                      : isRedzoneTheme
                      ? "linear-gradient(180deg, rgba(255,160,160,0.02) 0%, transparent 24%, transparent 76%, rgba(255,160,160,0.015) 100%)"
                      : "linear-gradient(180deg, rgba(255,255,255,0.012) 0%, transparent 24%, transparent 76%, rgba(255,255,255,0.012) 100%)",
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
                      textShadow: isPoemTheme
                        ? "0 0 12px rgba(255, 215, 235, 0.14)"
                        : isRedzoneTheme
                        ? "0 0 12px rgba(255, 100, 100, 0.1)"
                        : "none",
                    }}
                  >
                    {selectedIntel.title}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      color: isPoemTheme ? "#ffe6f3" : isRedzoneTheme ? "#ffd1d1" : "#bcd4ff",
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
                    onError={(e) => {
                      e.currentTarget.src = selectedIntel.image + "?retry=" + Date.now();
                    }}
                    style={{
                      width: "100%",
                      maxWidth: "320px",
                      borderRadius: "12px",
                      border: isPoemTheme
                        ? "1px solid rgba(255, 220, 240, 0.26)"
                        : isRedzoneTheme
                        ? "1px solid rgba(255, 160, 160, 0.18)"
                        : "1px solid rgba(160, 200, 255, 0.18)",
                      objectFit: "cover",
                      display: "block",
                      boxShadow: isPoemTheme
                        ? "0 0 18px rgba(255, 170, 215, 0.12), 0 0 34px rgba(255, 200, 228, 0.05)"
                        : isRedzoneTheme
                        ? "0 0 18px rgba(255, 100, 100, 0.1)"
                        : "none",
                      filter: isPoemTheme ? "brightness(1.04) saturate(1.08)" : isRedzoneTheme ? "brightness(1.02) saturate(1.02)" : "none",
                    }}
                  />
                </div>

                <div
                  style={{
                    border: isPoemTheme
                      ? "1px solid rgba(255, 220, 240, 0.18)"
                      : isRedzoneTheme
                      ? "1px solid rgba(255, 160, 160, 0.15)"
                      : "1px solid rgba(160, 200, 255, 0.15)",
                    borderRadius: "12px",
                    background: isPoemTheme
                      ? "rgba(50, 18, 40, 0.95)"
                      : isRedzoneTheme
                      ? "rgba(14, 4, 6, 0.95)"
                      : "rgba(4, 11, 20, 0.95)",
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
                      color: isPoemTheme ? "#ffd4ea" : isRedzoneTheme ? "#ffb5b5" : "#8fb7ff",
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
                      lineHeight: "1.78",
                      color: isPoemTheme ? "#fff6fb" : isRedzoneTheme ? "#fff0f0" : "#eaf2ff",
                      textShadow: isPoemTheme
                        ? "0 0 8px rgba(255, 220, 238, 0.06)"
                        : isRedzoneTheme
                        ? "0 0 6px rgba(255, 130, 130, 0.04)"
                        : "0 0 6px rgba(180, 220, 255, 0.03)",
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
          </>
        )}
      </div>

      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          zIndex: 3,
          opacity: isPoemTheme ? 0.055 : isRedzoneTheme ? 0.05 : 0.075,
          background: isPoemTheme
            ? "repeating-linear-gradient(to bottom, rgba(255,245,250,0.08) 0px, rgba(255,245,250,0.08) 1px, transparent 2px, transparent 5px)"
            : isRedzoneTheme
            ? "repeating-linear-gradient(to bottom, rgba(255,215,215,0.08) 0px, rgba(255,215,215,0.08) 1px, transparent 2px, transparent 5px)"
            : "repeating-linear-gradient(to bottom, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 2px, transparent 5px)",
          mixBlendMode: "overlay",
          transition: "opacity 0.35s ease, background 0.35s ease",
        }}
      />

      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          zIndex: 4,
          opacity: isPoemTheme ? 0.035 : isRedzoneTheme ? 0.03 : 0.028,
          backgroundImage: isPoemTheme
            ? `
              radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12) 0 1px, transparent 1px),
              radial-gradient(circle at 80% 35%, rgba(255,220,238,0.11) 0 1px, transparent 1px),
              radial-gradient(circle at 45% 70%, rgba(255,225,240,0.12) 0 1px, transparent 1px),
              radial-gradient(circle at 65% 85%, rgba(255,210,232,0.08) 0 1px, transparent 1px)
            `
            : isRedzoneTheme
            ? `
              radial-gradient(circle at 20% 20%, rgba(255,210,210,0.12) 0 1px, transparent 1px),
              radial-gradient(circle at 80% 35%, rgba(255,150,150,0.08) 0 1px, transparent 1px),
              radial-gradient(circle at 45% 70%, rgba(255,210,210,0.11) 0 1px, transparent 1px),
              radial-gradient(circle at 65% 85%, rgba(255,120,120,0.08) 0 1px, transparent 1px)
            `
            : `
              radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12) 0 1px, transparent 1px),
              radial-gradient(circle at 80% 35%, rgba(255,255,255,0.1) 0 1px, transparent 1px),
              radial-gradient(circle at 45% 70%, rgba(255,255,255,0.11) 0 1px, transparent 1px),
              radial-gradient(circle at 65% 85%, rgba(255,255,255,0.08) 0 1px, transparent 1px)
            `,
          backgroundSize: "140px 140px, 180px 180px, 160px 160px, 200px 200px",
          animation: "noiseMoveSoft 1.8s linear infinite",
          transition: "opacity 0.35s ease, background-image 0.35s ease",
        }}
      />

      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          zIndex: 1,
          boxShadow: isPoemTheme
            ? "inset 0 0 100px rgba(55, 12, 38, 0.18)"
            : isRedzoneTheme
            ? "inset 0 0 120px rgba(40, 0, 0, 0.34)"
            : "inset 0 0 100px rgba(0, 0, 0, 0.28)",
          transition: "box-shadow 0.35s ease",
        }}
      />

      <style>
        {`
          @keyframes blink {
            50% {
              opacity: 0;
            }
          }

          @keyframes deniedFlashSoft {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }

          @keyframes noiseMoveSoft {
            0% { transform: translate(0, 0); }
            25% { transform: translate(-2px, 1px); }
            50% { transform: translate(1px, -2px); }
            75% { transform: translate(-1px, -1px); }
            100% { transform: translate(0, 0); }
          }

          @keyframes petalFloat {
            0% { transform: translateY(0px) translateX(0px); }
            25% { transform: translateY(10px) translateX(-6px); }
            50% { transform: translateY(22px) translateX(8px); }
            75% { transform: translateY(34px) translateX(-5px); }
            100% { transform: translateY(46px) translateX(6px); }
          }

          @keyframes bootFlow {
            0% {
              transform: translateX(90px);
              opacity: 0;
            }
            10% {
              opacity: 0.9;
            }
            85% {
              opacity: 0.75;
            }
            100% {
              transform: translateX(-300px);
              opacity: 0;
            }
          }

          body {
            margin: 0;
            background: #06111f;
          }

          * {
            box-sizing: border-box;
          }

          input::placeholder {
            color: ${isRedzoneTheme ? "#c99999" : "#8ea8cf"};
          }

          button:hover {
            filter: brightness(1.06);
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
            background: ${isRedzoneTheme ? "rgba(255, 150, 150, 0.25)" : "rgba(160, 200, 255, 0.25)"};
            border-radius: 999px;
          }
        `}
      </style>
    </div>
  );
}
