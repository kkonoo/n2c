// 공모·신청 종류: 신청 화면(apply.js)과 관리자 화면(admin-applications.js)이 함께 써요.
// 종류를 더하거나 빼면 firestore.rules의 type 목록도 같이 고쳐요.

export const GROUPS = {
  research: { ko: '연구 공모', en: 'Research calls' },
  training: { ko: '연수·인턴십', en: 'Training & internships' },
  event: { ko: '세미나·워크숍 참가', en: 'Seminars & workshops' },
};

// 칸: key, 한국어·영어 이름, kind(text·date·textarea·choice·check), required, options(choice: [한국어, 영어]),
// short(관리자 화면·CSV에 쓰는 짧은 이름)
const F = {
  advisor: { key: 'advisor', ko: '지도교수', en: 'Advisor', required: true },
  members: { key: 'members', ko: '팀원 (이름·소속·과정)', en: 'Team members (name, affiliation, program)', kind: 'textarea', required: true, short: '팀원' },
};

export const TYPES = {
  'seed-pi': {
    group: 'research', ko: 'Seed-PI 과제', en: 'Seed-PI project',
    fields: [
      { key: 'topic', ko: '연구 주제', en: 'Research topic', required: true },
      { key: 'abstract', ko: '연구 내용 요약', en: 'Summary', kind: 'textarea', required: true },
      { key: 'mentor', ko: '희망 멘토 교수', en: 'Preferred faculty mentor' },
    ],
    files: ['예: 연구 제안서, 연구 업적 목록', 'e.g. research proposal, list of publications'],
  },
  humanities: {
    group: 'research', ko: '의료인문학 융합연구 과제', en: 'Medical humanities research',
    fields: [
      { key: 'topic', ko: '과제명', en: 'Project title', required: true },
      { key: 'abstract', ko: '연구 내용 요약', en: 'Summary', kind: 'textarea', required: true },
    ],
    files: ['예: 연구 계획서', 'e.g. research plan'],
  },
  study: {
    group: 'research', ko: '대학원생 융합연구 스터디', en: 'Graduate convergence study group',
    fields: [
      { key: 'topic', ko: '스터디 이름·주제', en: 'Study group name and topic', required: true },
      F.members,
      { key: 'plan', ko: '활동 계획', en: 'Plan', kind: 'textarea', required: true },
      { ...F.advisor, required: false },
    ],
    files: ['예: 스터디 계획서', 'e.g. study plan'],
  },
  club: {
    group: 'research', ko: '학부 연구 동아리', en: 'Undergraduate research club',
    fields: [
      { key: 'topic', ko: '동아리 이름·주제', en: 'Club name and topic', required: true },
      F.members,
      { key: 'plan', ko: '활동 계획', en: 'Plan', kind: 'textarea' },
    ],
    files: ['예: 활동 계획서', 'e.g. activity plan'],
  },
  'industry-intern': {
    group: 'training', ko: '산학 연계 학기제 인턴십', en: 'Industry semester internship',
    fields: [
      { key: 'company', ko: '희망 기업·분야', en: 'Preferred company or field', required: true },
      { key: 'term', ko: '희망 학기', en: 'Preferred semester' },
      F.advisor,
    ],
    files: ['예: 지원서, 이력서', 'e.g. application, CV'],
  },
  'global-training': {
    group: 'training', ko: '글로벌 단기 연수', en: 'Global short-term training',
    fields: [
      { key: 'company', ko: '희망 연수 기관·국가', en: 'Host institution and country', required: true },
      { key: 'term', ko: '희망 기간', en: 'Preferred dates' },
      F.advisor,
      { key: 'plan', ko: '연수 계획', en: 'Training plan', kind: 'textarea' },
    ],
    files: ['예: 연수 계획서, 초청장', 'e.g. training plan, invitation letter'],
  },
  'lab-intern': {
    group: 'training', ko: '순환형 연구 인턴십', en: 'Lab rotation internship',
    fields: [
      { key: 'topic', ko: '관심 연구 분야', en: 'Research interests', required: true },
      { key: 'term', ko: '참여 가능 기간', en: 'Available dates' },
    ],
    files: ['예: 자기소개서, 성적표', 'e.g. personal statement, transcript'],
  },
  workshop: {
    group: 'event', ko: '세미나·워크숍·부트캠프 참가', en: 'Seminar, workshop or bootcamp',
    fields: [
      { key: 'topic', ko: '프로그램 이름', en: 'Program name', required: true },
      { key: 'plan', ko: '참가 동기', en: 'Why you want to join', kind: 'textarea' },
    ],
    files: ['파일은 필요할 때만 올려 주세요.', 'Attach files only if needed.'],
  },
};

// 목록에 보일 한 줄 제목: 그 종류의 첫 글자 칸
export function summary(a) {
  const t = TYPES[a.type];
  const key = t?.fields.find(f => !f.kind || f.kind === 'textarea')?.key;
  return String(a.details?.[key] ?? '').split('\n')[0];
}

// 결과 이름은 묶음마다 달라요
const RESULT = {
  research: { approved: ['선정', 'Selected'], rejected: ['미선정', 'Not selected'] },
  training: { approved: ['선정', 'Selected'], rejected: ['미선정', 'Not selected'] },
  event: { approved: ['참가 확정', 'Confirmed'], rejected: ['참가 불가', 'Declined'] },
};
export function statusLabel(a, status = a.status) {
  if (status === 'submitted') return ['접수', 'Submitted'];
  return RESULT[TYPES[a.type]?.group]?.[status] || [status, status];
}

// 관리자 화면에 쓰는 세부 내용 [이름, 값]
export function detailRows(a) {
  const t = TYPES[a.type];
  return (t?.fields || []).map(f => [f.short || f.ko, a.details?.[f.key]]).filter(([, v]) => v != null && v !== '');
}
