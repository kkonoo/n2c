// 사업단 소개 → 구성원: 관리자가 넣은 구성원을 보여 줘요.
// 그룹을 정한 사람은 그룹별로(책임 → 공동 → 참여, 그다음 가나다순) 먼저, 나머지는 구분별로 가나다순으로.
// 한 사람은 한 번만 나와요. 아무도 없거나 불러오지 못하면 HTML에 있는 안내가 그대로 보여요.
import { enabled, firestore } from './firebase.js';
import { bi, esc } from './posts.js';

export const ROLES = {
  faculty: { ko: '참여교수', en: 'Participating faculty' },
  visiting: { ko: '연구초빙교수', en: 'Visiting research professors' },
  fulltime: { ko: '전임연구원', en: 'Full-time researchers' },
  postdoc: { ko: '박사후연구원', en: 'Postdoctoral researchers' },
  researcher: { ko: '연구원', en: 'Researchers' },
  student: { ko: '대학원생', en: 'Graduate students' },
  staff: { ko: '행정', en: 'Administration' },
};

// 핵심과제 그룹과 그룹 안 역할 (firestore.rules와 같게)
export const GROUPS = {
  g1: { ko: '1그룹 · 치료제 발굴', en: 'Group 1 · Drug discovery', short: '1그룹' },
  g2: { ko: '2그룹 · 엔지니어링', en: 'Group 2 · Engineering', short: '2그룹' },
  g3: { ko: '3그룹 · 동반진단', en: 'Group 3 · Companion diagnostics', short: '3그룹' },
  auto: { ko: '자율과제', en: 'Autonomous projects', short: '자율과제' },
};
export const GROUP_ROLES = {
  lead: { ko: '책임', en: 'Lead' },
  co: { ko: '공동', en: 'Co-PI' },
  member: { ko: '참여', en: 'Member' },
};
const roleRank = p => Object.keys(GROUP_ROLES).indexOf(p.groupRole) >>> 0;   // 없으면 맨 뒤

export const sortMembers = list => list.sort((a, b) => a.nameKo.localeCompare(b.nameKo, 'ko'));
export const photoOk = s => /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s || '');

// 영문 칸이 비어 있으면 영어 화면에도 한국어로 보여요
const both = (ko, en) => bi(esc(ko), esc(en || ko));

export function memberPhoto(p) {
  return photoOk(p.photo)
    ? `<span class="faculty-photo"><img src="${p.photo}" alt=""></span>`
    : `<span class="faculty-photo" aria-hidden="true">${both(p.nameKo[0], (p.nameEn || p.nameKo)[0])}</span>`;
}

function card(p, inGroup = false) {
  const tag = inGroup && (p.groupRole === 'lead' || p.groupRole === 'co') ? GROUP_ROLES[p.groupRole] : null;
  return `<li class="faculty-card">
    ${memberPhoto(p)}
    <div>
      ${tag ? `<span class="tag alt">${bi(tag.ko, tag.en)}</span> ` : ''}<strong>${both(p.nameKo, p.nameEn)}</strong>${p.positionKo ? ` <small>${both(p.positionKo, p.positionEn)}</small>` : ''}
      ${p.deptKo ? `<p>${both(p.deptKo, p.deptEn)}</p>` : ''}
      ${p.researchKo ? `<p class="research">${both(p.researchKo, p.researchEn)}</p>` : ''}
      ${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''}
    </div>
  </li>`;
}

const list = document.getElementById('memberList');
if (enabled && list) {
  firestore()
    .then(({ db, fs }) => fs.getDocs(fs.collection(db, 'members')))
    .then(snap => {
      const people = sortMembers(snap.docs.map(d => d.data()));
      if (!people.length) return;
      const section = (label, items, inGroup) => (items.length
        ? `<h3 class="block-title">${bi(label.ko, label.en)}</h3><ul class="faculty-grid">${items.map(p => card(p, inGroup)).join('')}</ul>`
        : '');
      list.innerHTML = Object.entries(GROUPS)
        .map(([g, label]) => section(label, people.filter(p => p.group === g).sort((a, b) => roleRank(a) - roleRank(b)), true))
        .concat(Object.entries(ROLES).map(([role, label]) => section(label, people.filter(p => !(p.group in GROUPS) && p.role === role), false)))
        .join('');
      list.hidden = false;
      document.getElementById('memberNote').hidden = true;
    })
    .catch(err => console.error(err));
}
