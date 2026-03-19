export type IntelEntry = {
  code: string;
  title: string;
  subtitle: string;
  image: string;
  text: string;
};

export const intelDatabase: IntelEntry[] = [
  {
    code: "ORION-17",
    title: "ORION-17 / 현장 요원 파일",
    subtitle: "등급: SECRET",
    image: "/intel/sample-agent.jpg",
    text: `장기 잠입 임무 수행 중.
최종 보고 지점은 제7항 폐구역.
현재 상태: 신호 불안정.

추가 메모:
- 외부 접촉 최소화
- 비인가 통신 금지
- 필요 시 즉시 회수 작전 전환`,
  },
  {
    code: "SANDSTORM",
    title: "작전명 SANDSTORM",
    subtitle: "등급: TOP SECRET",
    image: "/intel/sample-operation.jpg",
    text: `사막 지역 회수 작전 브리핑.

예정 투입 인원: 4명
예상 위협도: 높음
위성 관측 결과, 목표 구역 주변 열신호 다수 포착.

주의:
무단 열람 시 추적 프로토콜이 자동 가동됩니다.`,
  },
];