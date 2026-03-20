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
    code: "recycle",
    title: "recycle 프로토콜",
    subtitle: "등급: TOP SECRET",
    image: "/intel/sample-operation.jpg",
    text: `치안국의 고위 간부들에 한하여 전달하라.

내용 : 난민촌 정리 중 발생한 시신들을 보관처리할 것.
비고 : 소마의 보충.

주의:
무단 열람 시 추적 프로토콜이 자동 가동됩니다.`,
  },{
    code: "ta1k",
    title: "n번째 회의록",
    subtitle: "등급: 옐로우",
    image: "/intel/ta1k.jpg",
    text: `A:[][] [][] 을 위하여 에우도라를 파견한다.
    B:왜 하필 에우도라입니까? 
    이번 사안은 원로원 측에서 먼저 제시한 사안인 만큼,
    차라리 에리니에스를 보내는 편이 좋지 않겠습니까?
    A:산타 에르만다드를 잿더미로 만든 후, 그들이 어떤 취급을 받고 있는지 잘 알지 않나?
    B:....
    A:그들도 제 쓸모를 증명할 때가 필요하겠지.
    
    B:...알겠습니다. 조만간 작전 계획을 올리겠습니다.`,
  },
];