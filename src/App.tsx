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
        color: "#d8e6ff",
        padding: "20px",
        fontFamily: "monospace",
      }}
    >
      <h2>NEW SAN DIEGO INTELLIGENCE AGENCY</h2>

      <div>
        {visibleBootLines.map((line, index) => (
          <div key={index}>&gt; {line}</div>
        ))}
      </div>

      {bootStage === "ready" && (
        <div style={{ marginTop: "20px" }}>
          <input
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="코드 입력"
          />
          <button onClick={handleSubmit}>확인</button>
        </div>
      )}

      <div style={{ marginTop: "10px" }}>{statusText}</div>

      {selectedIntel && (
        <div style={{ marginTop: "30px" }}>
          <h3>{selectedIntel.title}</h3>
          <p>{selectedIntel.subtitle}</p>
          <img src={selectedIntel.image} style={{ width: "300px" }} />
          <pre>{selectedIntel.text}</pre>
        </div>
      )}
    </div>
  );
}