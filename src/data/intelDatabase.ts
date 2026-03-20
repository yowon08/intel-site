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
  {
    code: "rep0rt",
    title: "B의 작전 계획서",
    subtitle: "등급: 레드",
    image: "/intel/rep0rt.jpg",
    text: `...상기된 작전 지역으로 에우도라 요원 한 명을 파견한다. 
    사전에 파악된 것에 따라, 총 세 구역에서 데이터 침투 프로토콜을 사용하여 정보를 탈취한 후 중앙으로 탈출해 복귀하라.
    작전 지역은 매우 많은 방이 격리된 채 나열된 곳으로, 다른 방으로 넘어가기 위해선 환풍구를 이용해야만 한다.
    예상되는 위험 요소는 없으나, 혹여 위험 대상이 나타난다면 절대 대응하지 말도록 한다.
    가까운 다른 방으로 이동하거나 멀리 떨어진 뒤에 작전을 속행하라.
    
    작전 지역에선 예기치 못한 섬광이나 굉음이 발생할 수 있다.
    빛이나 소음에 예민한 요원은 투입하지 말 것.

    https://intel-breach.vercel.app/
    `
    ,
  },
 {
  code: "S3CUR3D",
    title: "에우도라의 보고서",
    subtitle: "등급: 레드",
    image: "/intel/S3CUR3D",
    text: `결과 : 모든 데이터 확보 완료.

    ...스틱스에서 내린 작전 명령에 따라 에우도라의 요원 하나를 파견해서 임무를 완수했다.
    분석 결과에 따라, 가제 '트라이엄프 진군'에 차질은 없을 것으로 보인다.
    그러나 현장에 파견했던 요원에 따르면, 사전에 전달받았던 정보와 달리 작전 지역에 정체불명의 제3자가 존재했다.
    이에 대한 분석 재검토를 요청하는 바다.

    언제나 그렇듯, 우린 잠들지 못하니.

    `
    ,
 }
];