// 구성원 → 참여 연구원: 관리자가 넣은 구성원을 구분별로 가나다순으로 보여 줘요.
// 아무도 없거나 불러오지 못하면 HTML에 있는 안내가 그대로 보여요.
import { enabled, firestore } from './firebase.js';
import { bi, esc } from './posts.js';

export const ROLES = {
  fulltime: { ko: '전임연구원', en: 'Full-time researchers' },
  postdoc: { ko: '박사후연구원', en: 'Postdoctoral researchers' },
  researcher: { ko: '연구원', en: 'Researchers' },
  student: { ko: '대학원생', en: 'Graduate students' },
  staff: { ko: '행정', en: 'Administration' },
};

export const sortMembers = list => list.sort((a, b) => a.nameKo.localeCompare(b.nameKo, 'ko'));
export const photoOk = s => /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s || '');

// 영문 칸이 비어 있으면 영어 화면에도 한국어로 보여요
const both = (ko, en) => bi(esc(ko), esc(en || ko));

export function memberPhoto(p) {
  return photoOk(p.photo)
    ? `<span class="faculty-photo"><img src="${p.photo}" alt=""></span>`
    : `<span class="faculty-photo" aria-hidden="true">${both(p.nameKo[0], (p.nameEn || p.nameKo)[0])}</span>`;
}

function card(p) {
  return `<li class="faculty-card">
    ${memberPhoto(p)}
    <div>
      <strong>${both(p.nameKo, p.nameEn)}</strong>${p.positionKo ? ` <small>${both(p.positionKo, p.positionEn)}</small>` : ''}
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
      list.innerHTML = Object.entries(ROLES).map(([role, label]) => {
        const group = people.filter(p => p.role === role);
        return group.length
          ? `<h3 class="block-title">${bi(label.ko, label.en)}</h3><ul class="faculty-grid">${group.map(card).join('')}</ul>`
          : '';
      }).join('');
      list.hidden = false;
      document.getElementById('memberNote').hidden = true;
    })
    .catch(err => console.error(err));
}
