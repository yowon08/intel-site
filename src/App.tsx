import { useEffect, useMemo, useState } from "react";
import { intelDatabase } from "./data/intelDatabase";

type IntelEntry = {
  code: string;
  title: string;
  subtitle: string;
  image: string;
  text: string;
};

type BootStage = "booting" | "ready";

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

  useEffect(() => {
    let index = 0;

    const interval = setInterval(() => {
      setVisibleBootLines((prev) => {
        if (index < bootLines.length) {
          return [...prev, bootLines[index]];
        }
        return prev;
      });

      index++;

      if (index >= bootLines.length) {
        clearInterval(interval);

        setTimeout(() => {
          setBootStage("ready");
          setStatusText("접근 승인됨. 코드 입력 대기 중.");
        }, 700);
      }
    }, 900);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedIntel) {
      setDisplayedText("");
      return;
    }

    let charIndex = 0;
    setDisplayedText("");

    const typingInterval = setInterval(() => {
      charIndex++;
      setDisplayedText(selectedIntel.text.slice(0, charIndex));

      if (charIndex >= selectedIntel.text.length) {
        clearInterval(typingInterval);
      }
    }, 12);

    return () => clearInterval(typingInterval);
  }, [selectedIntel]);

  const normalizedDatabase = useMemo(() => {
    return intelDatabase.map((item) => ({
      ...item,
      normalizedCode: item.code.trim().toUpperCase(),
    }));
  }, []);

  const handleSubmit = () => {
    const code = inputCode.trim().toUpperCase();

    if (!code) {
      setStatusText("코드를 입력하세요.");
      return;
    }

    const found = normalizedDatabase.find(
      (item) => item.normalizedCode === code
    );

    if (found) {
      setStatusText("접근 승인됨...");
      setDisplayedText("");

      setTimeout(() => {
        setSelectedIntel(found);
        setStatusText(found.title + " 문서 열람 중");
      }, 500);
    } else {
      setSelectedIntel(null);
      setDisplayedText("");
      setStatusText("ACCESS DENIED");
    }
  };

  const handleReset = () => {
    setSelectedIntel(null);
    setDisplayedText("");
    setInputCode("");
    setStatusText("대기 중. 접근 코드를 입력하세요.");
  };

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #06111f 0%, #040b14 100%)",
        minHeight: "100vh",
        color: "#ffffff",
        padding: "20px 14px 40px",
        fontFamily: "monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "860px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h2
          style={{
            color: "#ffffff",
            letterSpacing: "2px",
            textAlign: "center",
            margin: "8px 0 0",
            fontSize: "clamp(18px, 4vw, 28px)",
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
          }}
        >
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
            color: statusText === "ACCESS DENIED" ? "#ff8b8b" : "#bcd4ff",
            fontSize: "14px",
            textAlign: "center",
            letterSpacing: "0.5px",
            minHeight: "22px",
            wordBreak: "break-word",
          }}
        >
          {statusText}
        </div>

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
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: "18px",
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

      <style>
        {`
          @keyframes blink {
            50% {
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
            color: #8ea8cf;
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