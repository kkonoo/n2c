// 성과 입력 항목: 교수님 입력 화면(report.js)과 관리자 성과 탭(admin-reports.js)이 함께 써요.
// 항목을 더하거나 빼면 firestore.rules의 cat 목록도 같이 고쳐요.
//
// 칸: k(이름), l(라벨), t(text·month·date·number·select·area·url·doi), o(보기), req(꼭),
//     full(한 줄 다), ph(예시), help(도움말), max(글자 수)

export const TASKS = ['핵심과제 1 · 치료제 발굴', '핵심과제 2 · 엔지니어링', '핵심과제 3 · 동반진단', '자율과제 · 의료인문학', '해당 없음'];
const YN = ['예', '아니오'];
const task = { k: 'task', l: '관련 과제', t: 'select', o: TASKS };

export const CATS = [
  {
    key: 'paper', name: '논문',
    rule: '사업단 성과로 낼 논문이에요. <b>DOI</b>를 넣고 <b>자동 채우기</b>를 누르면 제목·학술지·날짜가 들어와요. 사사(Acknowledgement)에 사업단 과제를 적었는지 꼭 골라 주세요.',
    fields: [
      { k: 'doi', l: 'DOI', t: 'doi', req: 1, full: 1, ph: '10.1038/s41467-019-09387-4' },
      { k: 'title', l: '논문 제목', t: 'text', req: 1, full: 1 },
      { k: 'journal', l: '학술지', t: 'text', req: 1 },
      { k: 'ym', l: '게재 연월', t: 'month', req: 1 },
      { k: 'vol', l: '권(호)', t: 'text', ph: '16(1)' },
      { k: 'pages', l: '쪽', t: 'text', ph: '201-230' },
      { k: 'role', l: '본인 저자 역할', t: 'select', o: ['1저자', '교신', '1저자·교신', '공저자'], req: 1 },
      { k: 'jcr', l: 'JCR 상위 %', t: 'number', ph: '8.5', help: '분야 순위 ÷ 분야 학술지 수 × 100. 상위 10% 논문을 세는 데 써요' },
      { k: 'ack', l: '사업단 사사 표기', t: 'select', o: YN, req: 1 },
      { k: 'intl', l: '국외 공동저자', t: 'select', o: YN },
      { k: 'student', l: '지도학생 주저자', t: 'text', ph: '홍길동, 김철수' },
      task,
    ],
    date: f => f.ym,
    title: f => f.title,
    meta: f => [f.journal, f.ym, f.role, f.jcr && `JCR 상위 ${f.jcr}%`],
    chips: f => [isTop10(f) && ['ok', '상위 10%'], f.intl === '예' && ['', '국제 공동'], f.ack === '아니오' && ['warn', '사사 없음'], !f.jcr && ['warn', 'JCR 미입력']],
  },
  {
    key: 'patent', name: '특허',
    rule: '출원한 특허와 등록된 특허를 모두 넣어 주세요. 출원했던 특허가 등록되면 새로 하나 더 넣어요.',
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
    key: 'transfer', name: '기술이전',
    rule: '대학 명의로 계약한 기술이전이에요. 금액은 천원 단위로 적어 주세요 (0원도 괜찮아요).',
    fields: [
      { k: 'title', l: '이전한 기술', t: 'text', req: 1, full: 1 },
      { k: 'company', l: '받은 기업', t: 'text', req: 1 },
      { k: 'date', l: '계약일', t: 'date', req: 1 },
      { k: 'amount', l: '계약 금액 (천원)', t: 'number', ph: '150000' },
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
    key: 'people', name: '인력양성',
    rule: '사업단 연구에 참여한 지도학생과 연구원이에요. 졸업하거나 그만두면 <b>상태</b>와 <b>진로</b>를 고쳐 주세요.',
    fields: [
      { k: 'name', l: '이름', t: 'text', req: 1 },
      { k: 'sid', l: '학번', t: 'text' },
      { k: 'degree', l: '과정', t: 'select', o: ['학부연구생', '석사', '박사', '석박통합', '박사후연구원', '연구원'], req: 1 },
      { k: 'status', l: '상태', t: 'select', o: ['재학', '수료', '졸업', '중단', '근무 중', '근무 끝'], req: 1 },
      { k: 'admit', l: '입학·임용 연월', t: 'month' },
      { k: 'grad', l: '졸업·끝난 연월', t: 'month' },
      { k: 'ckind', l: '진로', t: 'select', o: ['취업', '진학', '창업', '기타'] },
      { k: 'career', l: '진로 기관·직위', t: 'text', full: 1, ph: '한국뇌연구원 연수연구원' },
    ],
    date: f => f.grad || f.admit,
    title: f => f.name,
    meta: f => [f.degree, f.status, f.admit && `입학·임용 ${f.admit}`, f.grad && `졸업·끝 ${f.grad}`, f.career],
    chips: f => [f.status === '졸업' && !f.ckind && ['warn', '진로 미입력']],
  },
  {
    key: 'collab', name: '국제·산학 공동연구',
    rule: '외국 연구자나 기업과 함께한 공동연구예요. 공동 과제, MOU, 공동 논문으로 이어진 연구 모두 괜찮아요.',
    fields: [
      { k: 'kind', l: '구분', t: 'select', o: ['국제 공동연구', '산학 공동연구', '기타 공동연구'], req: 1 },
      { k: 'country', l: '국가', t: 'text', ph: '미국' },
      { k: 'partner', l: '상대 기관·연구자', t: 'text', req: 1, full: 1, ph: 'Harvard Medical School · Hyungsoon Im' },
      { k: 'title', l: '주제·과제명', t: 'text', req: 1, full: 1 },
      { k: 'start', l: '시작 연월', t: 'month' },
      { k: 'end', l: '끝난 연월 (진행 중이면 비워요)', t: 'month' },
      { k: 'output', l: '성과 (논문·특허·MOU·교류 등)', t: 'area', max: 300, full: 1 },
      task,
    ],
    date: f => f.start,
    title: f => f.title,
    meta: f => [f.kind, f.partner, f.country, f.start && `${f.start} – ${f.end || '진행 중'}`],
    chips: () => [],
  },
  {
    key: 'award', name: '수상',
    rule: '본인이나 지도학생이 받은 상이에요. 학생이 받았으면 받은 사람 이름도 적어 주세요.',
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
    key: 'press', name: '언론 보도',
    rule: '연구 성과나 사업단 활동이 실린 기사예요. 기사 주소를 넣어 주세요.',
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

export function isTop10(f) {
  const n = parseFloat(f.jcr);
  return Number.isFinite(n) && n <= 10;
}

// 실적이 속한 해 (관리자 집계·기간 거르기)
export const yearOf = r => String(CAT[r.cat]?.date(r.f || {}) || '').slice(0, 4);

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
    const extra = fd.t === 'number' ? ' step="any" min="0" inputmode="decimal"' : '';
    input = `<input name="${fd.k}" type="${type}" value="${val}" maxlength="${fd.max || 300}"${req}${ph}${extra}>`;
  }
  const help = fd.help ? `<small class="help">${esc(fd.help)}</small>` : '';
  return `<label class="field${fd.full ? ' full' : ''}"><span>${esc(fd.l)}${fd.req ? ' <em class="req">*</em>' : ''}</span>${input}${help}</label>`;
}
