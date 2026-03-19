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

  useEffect(() => {
    let index = 0;

    const interval = setInterval(() => {
      setVisibleBootLines((prev) => [...prev, bootLines[index]]);
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

      setTimeout(() => {
        setSelectedIntel(found);
        setStatusText(found.title + " 문서 열람 중");
      }, 500);
    } else {
      setSelectedIntel(null);
      setStatusText("ACCESS DENIED");
    }
  };

  return (
    <div
      style={{
        background: "#06111f",
        minHeight: "100vh",
        color: "#ffffff", // ✔ 전체 텍스트 흰색
        padding: "20px",
        fontFamily: "monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* 상단 타이틀 */}
      <h2 style={{ color: "#ffffff", letterSpacing: "2px" }}>
        NEW SAN DIEGO INTELLIGENCE AGENCY
      </h2>

      {/* 로그 */}
      <div style={{ marginTop: "20px" }}>
        {visibleBootLines.map((line, index) => (
          <div key={index}>&gt; {line}</div>
        ))}
      </div>

      {/* 입력 */}
      {bootStage === "ready" && (
        <div style={{ marginTop: "20px" }}>
          <input
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="코드 입력"
            style={{ padding: "8px", marginRight: "10px" }}
          />
          <button onClick={handleSubmit}>확인</button>
        </div>
      )}

      <div style={{ marginTop: "10px" }}>{statusText}</div>

      {/* 결과 */}
      {selectedIntel && (
        <div style={{ marginTop: "30px", textAlign: "center" }}>
          <h3>{selectedIntel.title}</h3>
          <p>{selectedIntel.subtitle}</p>
          <img src={selectedIntel.image} style={{ width: "300px" }} />
          <pre>{selectedIntel.text}</pre>
        </div>
      )}

      {/* 🔥 중앙 하단 로고 */}
      {!selectedIntel && (
        <div
          style={{
            marginTop: "80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: 0.9,
          }}
        >
          <img
            src="logo.png"
            alt="agency logo"
            style={{
              width: "160px",
              marginBottom: "20px",
              filter: "brightness(1.2)",
            }}
          />

          <div
            style={{
              fontSize: "14px",
              letterSpacing: "3px",
              color: "#bcd4ff",
            }}
          >
            뉴 샌디에이고 데이터 체계
          </div>
        </div>
      )}
    </div>
  );
}