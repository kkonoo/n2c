// 성과 입력 항목: 교수님 입력 화면(report.js)과 관리자 성과 탭(admin-reports.js)이 함께 써요.
// 항목은 글로컬랩 사업단 정량성과 집계 양식(2026 GLORY)의 14개 성과 항목에 맞춰 나눴어요 (아래 KPIS).
// 항목을 더하거나 빼면 firestore.rules의 cat 목록도 같이 고쳐요.
//
// 칸: k(이름), l(라벨), t(text·month·date·number·select·area·url·doi), o(보기), req(꼭),
//     full(한 줄 다), ph(예시), help(도움말), max(글자 수), int(정수만)

export const TASKS = ['핵심과제 1 · 치료제 발굴', '핵심과제 2 · 엔지니어링', '핵심과제 3 · 동반진단', '자율과제 · 의료인문학', '해당 없음'];
const YN = ['예', '아니오'];
const task = { k: 'task', l: '관련 과제', t: 'select', o: TASKS };
const TOP_CONF = '학술대회 (최우수학회)';
const isJournal = f => !f.kind || f.kind === '학술지';   // 예전에 넣은 논문(구분 없음)은 학술지로 봐요

// 입력 화면 왼쪽 탭의 묶음 (양식의 구분과 같아요)
export const GROUPS = ['연구성과', '인재양성', '협력·인프라', '지역혁신', '기타'];

export const CATS = [
  {
    key: 'paper', group: '연구성과', name: '논문',
    rule: '정량성과의 <b>상위 10% 이내 논문</b>과 <b>최우수학회 논문</b>에 들어가요. <b>DOI</b>를 넣고 <b>자동 채우기</b>를 누르면 제목·학술지·날짜가 들어와요. 사사(Acknowledgement)에 사업단 과제를 적었는지 꼭 골라 주세요.',
    fields: [
      { k: 'kind', l: '논문 구분', t: 'select', o: ['학술지', TOP_CONF, '학술대회 (기타)'], req: 1 },
      { k: 'role', l: '본인 저자 역할', t: 'select', o: ['1저자', '교신', '1저자·교신', '공저자'], req: 1 },
      { k: 'doi', l: 'DOI', t: 'doi', full: 1, ph: '10.1038/s41467-019-09387-4' },
      { k: 'title', l: '논문 제목', t: 'text', req: 1, full: 1 },
      { k: 'journal', l: '학술지·학술대회 이름', t: 'text', req: 1 },
      { k: 'ym', l: '게재·발표 연월', t: 'month', req: 1 },
      { k: 'vol', l: '권(호)', t: 'text', ph: '16(1)' },
      { k: 'pages', l: '쪽', t: 'text', ph: '201-230' },
      { k: 'jcr', l: 'JCR 상위 %', t: 'number', ph: '8.5', help: '학술지 논문만 적어요. 분야 순위 ÷ 분야 학술지 수 × 100. 10 이하면 상위 10% 논문이에요' },
      { k: 'ack', l: '사업단 사사 표기', t: 'select', o: YN, req: 1 },
      { k: 'intl', l: '국외 공동저자', t: 'select', o: YN },
      { k: 'student', l: '지도학생 주저자', t: 'text', ph: '홍길동, 김철수' },
      task,
    ],
    date: f => f.ym,
    title: f => f.title,
    meta: f => [f.journal, f.ym, f.role, isJournal(f) && f.jcr && `JCR 상위 ${f.jcr}%`],
    chips: f => [isTop10(f) && ['ok', '상위 10%'], f.kind === TOP_CONF && ['ok', '최우수학회'], f.kind === '학술대회 (기타)' && ['', '학술대회'],
      f.intl === '예' && ['', '국제 공동'], f.ack === '아니오' && ['warn', '사사 없음'], isJournal(f) && !f.jcr && ['warn', 'JCR 미입력']],
  },
  {
    key: 'patent', group: '연구성과', name: '특허',
    rule: '정량성과의 <b>국내 특허</b>·<b>해외 특허</b>에 들어가요 (PCT는 해외). 출원한 특허와 등록된 특허를 모두 넣어 주세요. 출원했던 특허가 등록되면 새로 하나 더 넣어요.',
    fields: [
      { k: 'kind', l: '구분', t: 'select', o: ['출원', '등록'], req: 1 },
      { k: 'country', l: '국가', t: 'select', o: ['국내', '해외', 'PCT'], req: 1 },
      { k: 'title', l: '발명의 명칭', t: 'text', req: 1, full: 1 },
      { k: 'number', l: '출원·등록 번호', t: 'text', req: 1, ph: '10-2026-0012345' },
      { k: 'date', l: '출원·등록일', t: 'date', req: 1 },
      { k: 'applicant', l: '출원인·권리자', t: 'text', ph: '경북대학교 산학협력단' },
      { k: 'inventors', l: '발명자', t: 'text', full: 1 },
      { k: 'ack', l: '사업단 성과 표기', t: 'select', o: YN },
      task,
    ],
    date: f => f.date,
    title: f => f.title,
    meta: f => [`${f.country || ''} ${f.kind || ''}`.trim(), f.number, f.date],
    chips: f => [f.kind === '등록' && ['ok', '등록']],
  },
  {
    key: 'event', group: '연구성과', name: '학술대회·세미나 개최',
    rule: '정량성과의 <b>학술대회·세미나 개최</b>에 들어가요. 사업단이나 연구실이 열거나 함께 연 학술대회·심포지엄·세미나·워크숍이에요. 행사 하나에 하나씩 넣어 주세요.',
    fields: [
      { k: 'kind', l: '구분', t: 'select', o: ['학술대회', '심포지엄', '세미나', '워크숍', '포럼', '기타'], req: 1 },
      { k: 'host', l: '주최 방식', t: 'select', o: ['주최', '공동주최', '주관'] },
      { k: 'title', l: '행사 이름', t: 'text', req: 1, full: 1 },
      { k: 'date', l: '날짜 (여러 날이면 첫날)', t: 'date', req: 1 },
      { k: 'end', l: '끝난 날', t: 'date' },
      { k: 'place', l: '장소', t: 'text', ph: '경북대학교 의과대학 본관' },
      { k: 'intl', l: '국제 행사', t: 'select', o: YN },
      { k: 'count', l: '참가 인원 (명)', t: 'number', int: 1 },
      { k: 'note', l: '연사·내용', t: 'area', max: 300, full: 1 },
      task,
    ],
    date: f => f.date,
    title: f => f.title,
    meta: f => [f.kind, f.host, f.date, f.place, f.count && `${f.count}명`],
    chips: f => [f.intl === '예' && ['', '국제']],
  },
  {
    key: 'people', group: '인재양성', name: '인력양성',
    rule: '사업단 연구에 참여한 지도학생과 연구원이에요. 석사·박사·석박통합은 정량성과의 <b>대학원생 지원</b>, 박사후연구원·신진연구자는 <b>학문후속세대 양성</b>에 들어가요(참여한 해마다 1건). 졸업하거나 그만두면 <b>상태</b>와 <b>진로</b>를 고쳐 주세요.',
    fields: [
      { k: 'name', l: '이름', t: 'text', req: 1 },
      { k: 'sid', l: '학번', t: 'text' },
      { k: 'degree', l: '과정', t: 'select', o: ['학부연구생', '석사', '박사', '석박통합', '박사후연구원', '신진연구자', '연구원'], req: 1, help: '신진연구자: 비전임교원 등 박사 학위 뒤 독립 연구를 시작한 연구자' },
      { k: 'status', l: '상태', t: 'select', o: ['재학', '수료', '졸업', '중단', '근무 중', '근무 끝'], req: 1 },
      { k: 'admit', l: '입학·임용 연월', t: 'month', req: 1 },
      { k: 'grad', l: '졸업·끝난 연월', t: 'month' },
      { k: 'ckind', l: '진로', t: 'select', o: ['취업', '진학', '창업', '기타'] },
      { k: 'career', l: '진로 기관·직위', t: 'text', full: 1, ph: '한국뇌연구원 연수연구원' },
    ],
    date: f => f.grad || f.admit,
    span: f => [f.admit, f.grad],   // 기간과 겹치면 들어가요
    title: f => f.name,
    meta: f => [f.degree, f.status, f.admit && `입학·임용 ${f.admit}`, f.grad && `졸업·끝 ${f.grad}`, f.career],
    chips: f => [f.status === '졸업' && !f.ckind && ['warn', '진로 미입력']],
  },
  {
    key: 'edu', group: '인재양성', name: '교육 프로그램',
    rule: '정량성과의 <b>교육인원</b>에 들어가요(참가 인원을 더해요). 사업단이 운영한 부트캠프·워크숍·강좌·인턴십·고교 프로그램 같은 교육이에요. 회차가 나뉘면 회차마다 하나씩 넣어 주세요.',
    fields: [
      { k: 'title', l: '프로그램 이름', t: 'text', req: 1, full: 1 },
      { k: 'kind', l: '구분', t: 'select', o: ['부트캠프', '워크숍·강좌', '교과목', '현장실습·인턴십', '고교·지역 프로그램', '기타'], req: 1 },
      { k: 'count', l: '교육 인원 (명)', t: 'number', int: 1, req: 1 },
      { k: 'date', l: '시작일', t: 'date', req: 1 },
      { k: 'end', l: '끝난 날', t: 'date' },
      { k: 'target', l: '대상', t: 'text', full: 1, ph: '대학원생, 지역 고교생' },
      { k: 'note', l: '내용', t: 'area', max: 300, full: 1 },
      task,
    ],
    date: f => f.date,
    title: f => f.title,
    meta: f => [f.kind, f.date, f.count && `${f.count}명`, f.target],
    chips: () => [],
  },
  {
    key: 'collab', group: '협력·인프라', name: '글로벌 교류',
    rule: '정량성과의 <b>글로벌 교류</b>에 들어가요. 외국 기관·연구자와의 공동연구, 초청, 방문·연수, MOU예요. 하나에 1건으로 세고, 시작 연월로 연도를 나눠요. 기업과의 공동연구는 <b>기업 지원</b>에 넣어 주세요.',
    fields: [
      { k: 'kind', l: '구분', t: 'select', o: ['국제 공동연구', '해외 연구자 초청', '해외 방문·연수', '국제 학술교류·MOU', '기타 국제 교류'], req: 1 },
      { k: 'country', l: '국가', t: 'text', req: 1, ph: '미국' },
      { k: 'partner', l: '상대 기관·연구자', t: 'text', req: 1, full: 1, ph: 'Harvard Medical School · Hyungsoon Im' },
      { k: 'title', l: '주제·내용', t: 'text', req: 1, full: 1 },
      { k: 'start', l: '시작 연월', t: 'month', req: 1 },
      { k: 'end', l: '끝난 연월 (진행 중이면 비워요)', t: 'month' },
      { k: 'output', l: '성과 (논문·특허·MOU 등)', t: 'area', max: 300, full: 1 },
      task,
    ],
    date: f => f.start,
    title: f => f.title,
    meta: f => [f.kind, f.partner, f.country, f.start && `${f.start} – ${f.end || '진행 중'}`],
    chips: () => [],
  },
  {
    key: 'infra', group: '협력·인프라', name: '거점 인프라 활용',
    rule: '정량성과의 <b>거점 인프라 활용</b>에 들어가요. 사업단 장비·시설을 바깥 기업·기관이 쓴 경우예요. 여러 번 쓰면 <b>이용 건수</b>에 적어 주세요(비우면 1건).',
    fields: [
      { k: 'facility', l: '시설·장비', t: 'text', req: 1, full: 1, ph: '공초점 현미경, 나노입자 분석기' },
      { k: 'user', l: '이용 기관', t: 'text', req: 1, ph: '㈜바이노텍' },
      { k: 'ukind', l: '이용 기관 구분', t: 'select', o: ['기업', '대학·연구기관', '병원', '기타'] },
      { k: 'date', l: '이용일 (기간이면 시작일)', t: 'date', req: 1 },
      { k: 'count', l: '이용 건수', t: 'number', int: 1, ph: '1' },
      { k: 'note', l: '내용', t: 'area', max: 300, full: 1 },
      task,
    ],
    date: f => f.date,
    title: f => f.facility,
    meta: f => [f.user, f.ukind, f.date, `${f.count || 1}건`],
    chips: () => [],
  },
  {
    key: 'company', group: '협력·인프라', name: '기업 지원',
    rule: '정량성과의 <b>기업 지원</b>에 들어가요. 기업과의 공동연구, 기술자문·지도, 시험·분석, 시제품 제작, 창업 지원이에요. 지원 하나에 하나씩 넣어 주세요.',
    fields: [
      { k: 'company', l: '기업', t: 'text', req: 1, ph: '㈜나노팬텍' },
      { k: 'kind', l: '지원 구분', t: 'select', o: ['산학 공동연구', '기술자문·지도', '시험·분석', '시제품 제작', '창업 지원', '교육·인력 지원', '기타'], req: 1 },
      { k: 'title', l: '내용', t: 'text', req: 1, full: 1 },
      { k: 'date', l: '날짜 (기간이면 시작일)', t: 'date', req: 1 },
      { k: 'end', l: '끝난 날', t: 'date' },
      { k: 'output', l: '성과', t: 'area', max: 300, full: 1 },
      task,
    ],
    date: f => f.date,
    title: f => f.title,
    meta: f => [f.company, f.kind, f.date],
    chips: () => [],
  },
  {
    key: 'transfer', group: '지역혁신', name: '기술이전',
    rule: '정량성과의 <b>기술이전(억원)</b>에 들어가요. 대학 명의로 계약한 기술이전과 그 기술료예요. 기술료는 천원 단위로 적고(0원도 괜찮아요), 나눠 받으면 받을 때마다 하나씩 넣어 주세요.',
    fields: [
      { k: 'title', l: '이전한 기술', t: 'text', req: 1, full: 1 },
      { k: 'company', l: '받은 기업', t: 'text', req: 1 },
      { k: 'date', l: '계약일·입금일', t: 'date', req: 1 },
      { k: 'amount', l: '기술료 (천원)', t: 'number', req: 1, ph: '150000', help: '150000은 1억 5천만 원이에요' },
      { k: 'type', l: '방식', t: 'select', o: ['통상실시권', '전용실시권', '양도', '노하우'] },
      { k: 'patent', l: '관련 특허 번호', t: 'text', full: 1 },
      task,
    ],
    date: f => f.date,
    title: f => f.title,
    meta: f => [f.company, f.date, f.amount && `${Number(f.amount).toLocaleString('ko-KR')}천원`, f.type],
    chips: () => [],
  },
  {
    key: 'econ', group: '지역혁신', name: '경제적 파급효과',
    rule: '정량성과의 <b>경제적 파급효과(억원)</b>에 들어가요. 사업단 성과로 생긴 기업 매출, 투자유치 같은 금액이에요. 금액은 천원 단위로 적어 주세요.',
    fields: [
      { k: 'kind', l: '구분', t: 'select', o: ['매출', '투자유치', '비용 절감', '기타'], req: 1 },
      { k: 'org', l: '기업·기관', t: 'text', req: 1 },
      { k: 'amount', l: '금액 (천원)', t: 'number', req: 1, ph: '300000', help: '300000은 3억 원이에요' },
      { k: 'date', l: '날짜', t: 'date', req: 1 },
      { k: 'title', l: '내용·근거', t: 'text', req: 1, full: 1, ph: '사업단 기술을 적용한 진단키트 매출' },
      task,
    ],
    date: f => f.date,
    title: f => f.title,
    meta: f => [f.kind, f.org, f.date, f.amount && `${Number(f.amount).toLocaleString('ko-KR')}천원`],
    chips: () => [],
  },
  {
    key: 'jobs', group: '지역혁신', name: '고용 창출',
    rule: '정량성과의 <b>고용창출 효과(명)</b>에 들어가요. 사업단 성과로 새로 고용한 인원이에요(사업단·연구실 신규 채용, 협력 기업 신규 고용).',
    fields: [
      { k: 'org', l: '기업·기관', t: 'text', req: 1 },
      { k: 'count', l: '고용 인원 (명)', t: 'number', int: 1, req: 1 },
      { k: 'date', l: '고용일', t: 'date', req: 1 },
      { k: 'kind', l: '고용 형태', t: 'select', o: ['정규직', '계약직', '기타'] },
      { k: 'title', l: '직무·내용', t: 'text', full: 1 },
      task,
    ],
    date: f => f.date,
    title: f => f.title || f.org,
    meta: f => [f.org, f.date, f.count && `${f.count}명`, f.kind],
    chips: () => [],
  },
  {
    key: 'award', group: '기타', name: '수상',
    rule: '본인이나 지도학생이 받은 상이에요. 학생이 받았으면 받은 사람 이름도 적어 주세요. 정량성과 양식에는 들어가지 않아요.',
    fields: [
      { k: 'title', l: '상 이름', t: 'text', req: 1, full: 1 },
      { k: 'org', l: '주는 곳', t: 'text', req: 1 },
      { k: 'date', l: '받은 날', t: 'date', req: 1 },
      { k: 'who', l: '받은 사람', t: 'select', o: ['본인', '지도학생', '공동'], req: 1 },
      { k: 'person', l: '받은 사람 이름 (학생일 때)', t: 'text' },
      { k: 'note', l: '내용', t: 'area', max: 300, full: 1 },
    ],
    date: f => f.date,
    title: f => f.title,
    meta: f => [f.org, f.date, f.who === '본인' ? '본인' : [f.who, f.person].filter(Boolean).join(' ')],
    chips: () => [],
  },
  {
    key: 'press', group: '기타', name: '언론 보도',
    rule: '연구 성과나 사업단 활동이 실린 기사예요. 기사 주소를 넣어 주세요. 정량성과 양식에는 들어가지 않아요.',
    fields: [
      { k: 'title', l: '기사 제목', t: 'text', req: 1, full: 1 },
      { k: 'outlet', l: '언론사', t: 'text', req: 1 },
      { k: 'date', l: '보도일', t: 'date', req: 1 },
      { k: 'url', l: '기사 주소', t: 'url', full: 1, ph: 'https://' },
      { k: 'note', l: '관련 성과', t: 'text', full: 1 },
    ],
    date: f => f.date,
    title: f => f.title,
    meta: f => [f.outlet, f.date],
    chips: () => [],
  },
];

export const CAT = Object.fromEntries(CATS.map(c => [c.key, c]));

// 호칭: 구성원 명단 직위에 '교수'가 들어 있거나 명단에 없으면 교수님, 아니면(박사·선임연구원 등) 박사님
export const honorific = position => (position && !position.includes('교수') ? '박사님' : '교수님');

export function isTop10(f) {
  const n = parseFloat(f.jcr);
  return isJournal(f) && Number.isFinite(n) && n <= 10;
}

// ---------- 정량성과 14개 항목 ----------
// 양식의 순서 그대로예요 (엑셀 사업단입력 7–20행, 파워포인트 '값_…' 상자 이름).
// cat의 실적 가운데 match에 맞는 것을 세요. value가 있으면 그 값을 더하고, 없으면 1건씩이에요.
const num = v => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const POSTDOC = ['박사후연구원', '신진연구자'], GRAD = ['석사', '박사', '석박통합'];
export const KPIS = [
  { key: 'top10', group: '연구성과', name: '상위 10% 이내 논문', unit: '건', cat: 'paper', match: isTop10, rule: '학술지 논문 중 JCR 상위 10% 이내 (게재 연월)' },
  { key: 'topconf', group: '연구성과', name: '최우수학회 논문', unit: '건', cat: 'paper', match: f => f.kind === TOP_CONF, rule: '논문 구분이 최우수학회인 학술대회 논문 (발표 연월)' },
  { key: 'conf', group: '연구성과', name: '학술대회·세미나 개최', unit: '건', cat: 'event', rule: '개최한 행사 수 (행사 날짜)' },
  { key: 'kr_pat', group: '연구성과', name: '국내 특허', unit: '건', cat: 'patent', match: f => f.country === '국내', rule: '국내 출원 + 등록 (출원·등록일)' },
  { key: 'intl_pat', group: '연구성과', name: '해외 특허', unit: '건', cat: 'patent', match: f => !!f.country && f.country !== '국내', rule: '해외·PCT 출원 + 등록 (출원·등록일)' },
  { key: 'nextgen', group: '인재양성', name: '학문후속세대 양성', unit: '건', cat: 'people', match: f => POSTDOC.includes(f.degree), rule: '박사후연구원·신진연구자, 참여 기간이 겹치면 1건' },
  { key: 'grad', group: '인재양성', name: '대학원생 지원', unit: '건', cat: 'people', match: f => GRAD.includes(f.degree), rule: '석사·박사·석박통합, 참여 기간이 겹치면 1건' },
  { key: 'edu', group: '인재양성', name: '교육인원', unit: '명', cat: 'edu', value: f => Math.round(num(f.count)), rule: '교육 프로그램 교육 인원의 합 (시작일)' },
  { key: 'global', group: '협력·인프라', name: '글로벌 교류', unit: '건', cat: 'collab', rule: '글로벌 교류 수 (시작 연월)' },
  { key: 'infra', group: '협력·인프라', name: '거점 인프라 활용', unit: '건', cat: 'infra', value: f => Math.round(num(f.count)) || 1, rule: '이용 건수의 합 (이용일)' },
  { key: 'company', group: '협력·인프라', name: '기업 지원', unit: '건', cat: 'company', rule: '기업 지원 수 (날짜)' },
  { key: 'techtr', group: '지역혁신', name: '기술이전', unit: '억원', cat: 'transfer', value: f => num(f.amount) / 1e5, rule: '기술료 합 (계약일·입금일), 천원 ÷ 100,000' },
  { key: 'econ', group: '지역혁신', name: '경제적 파급효과', unit: '억원', cat: 'econ', value: f => num(f.amount) / 1e5, rule: '매출·투자유치 등 금액 합 (날짜), 천원 ÷ 100,000' },
  { key: 'jobs', group: '지역혁신', name: '고용창출 효과', unit: '명', cat: 'jobs', value: f => Math.round(num(f.count)), rule: '고용 인원의 합 (고용일)' },
];

// 실적의 연·월 (YYYY-MM)
export const monthOf = r => String(CAT[r.cat]?.date(r.f || {}) || '').slice(0, 7);

// 기간(from·to: YYYY-MM, 비우면 끝없음)에 드는지. span이 있는 항목(인력양성)은 기간과 겹치면 들어가요
export function inRange(r, from, to) {
  const c = CAT[r.cat], f = r.f || {};
  if (!c) return false;
  if (c.span) {
    const [a, b] = c.span(f).map(v => String(v || '').slice(0, 7));
    return (!to || !a || a <= to) && (!from || !b || b >= from);
  }
  const m = monthOf(r);
  return (!from || (m && m >= from)) && (!to || (m && m <= to));
}

// 14개 항목의 값과 근거 실적. 억원은 소수 첫째 자리까지
export function tally(list, from, to) {
  return KPIS.map(k => {
    const hits = list.filter(r => r.cat === k.cat && inRange(r, from, to) && (!k.match || k.match(r.f || {})));
    const sum = hits.reduce((s, r) => s + (k.value ? k.value(r.f || {}) : 1), 0);
    return { ...k, value: k.unit === '억원' ? Math.round(sum * 10) / 10 : sum, hits };
  });
}

// 2026-03 → 2026.03, 2026-03-05 → 2026.03.05
export const pretty = v => String(v ?? '').replace(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/, (_, y, m, d) => d ? `${y}.${m}.${d}` : `${y}.${m}`);

// 목록 한 칸: 제목, 나머지 정보, 표시
export function cellHTML(r, esc) {
  const c = CAT[r.cat], f = r.f || {};
  const meta = c.meta(f).filter(Boolean).map(v => esc(pretty(v))).join(' · ');
  const chips = c.chips(f).filter(Boolean).map(([k, t]) => `<span class="chip ${k}">${esc(t)}</span>`).join('');
  return `<b>${esc(c.title(f) || '(제목 없음)')}</b>${chips ? ` ${chips}` : ''}${meta ? `<span class="sub">${meta}</span>` : ''}`;
}

// 입력 칸
export function fieldHTML(fd, v, esc) {
  const val = esc(v ?? '');
  const req = fd.req ? ' required' : '';
  const ph = fd.ph ? ` placeholder="${esc(fd.ph)}"` : '';
  let input;
  if (fd.t === 'select') {
    input = `<select name="${fd.k}"${req}><option value="">고르기</option>${fd.o.map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  } else if (fd.t === 'area') {
    input = `<textarea name="${fd.k}" rows="3" maxlength="${fd.max || 1000}"${req}${ph}>${val}</textarea>`;
  } else if (fd.t === 'doi') {
    input = `<span class="doi-row"><input name="${fd.k}" value="${val}"${req}${ph} autocomplete="off" spellcheck="false"><button class="btn-s" type="button" data-doi>자동 채우기</button></span><small class="doi-msg" id="doiMsg"></small>`;
  } else {
    const type = { month: 'month', date: 'date', number: 'number', url: 'url' }[fd.t] || 'text';
    const extra = fd.t === 'number' ? (fd.int ? ' step="1" min="0" inputmode="numeric"' : ' step="any" min="0" inputmode="decimal"') : '';
    input = `<input name="${fd.k}" type="${type}" value="${val}" maxlength="${fd.max || 300}"${req}${ph}${extra}>`;
  }
  const help = fd.help ? `<small class="help">${esc(fd.help)}</small>` : '';
  return `<label class="field${fd.full ? ' full' : ''}"><span>${esc(fd.l)}${fd.req ? ' <em class="req">*</em>' : ''}</span>${input}${help}</label>`;
}
