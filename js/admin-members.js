// 관리자: 구성원 (홈페이지 사업단 소개 → 구성원에 나와요)
import { esc } from './posts.js';
import { ROLES, GROUPS, GROUP_ROLES, sortMembers, memberPhoto } from './members.js';

const FIELDS = ['nameKo', 'nameEn', 'role', 'group', 'groupRole', 'positionKo', 'positionEn', 'deptKo', 'deptEn', 'researchKo', 'researchEn', 'email'];
const RESEARCH = ['researchKo', 'researchEn'];
const groupText = p => (p.group in GROUPS ? [GROUPS[p.group].short, GROUP_ROLES[p.groupRole]?.ko].filter(Boolean).join(' · ') : '');
const isEmail = s => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(s);

// 사진은 세로 3:4로 잘라 150×200 JPEG로 줄여 Firestore 문서에 그대로 넣어요 (한 장 10~20KB)
async function shrinkPhoto(file) {
  const img = await createImageBitmap(file);
  const W = 150, H = 200;
  const scale = Math.max(W / img.width, H / img.height);
  const w = img.width * scale, h = img.height * scale;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  // 가로는 가운데, 세로는 얼굴이 있는 위쪽을 더 남겨요
  g.drawImage(img, (W - w) / 2, (H - h) * 0.25, w, h);
  return c.toDataURL('image/jpeg', 0.85);
}

// 엑셀 '구분' 칸을 일곱 중 하나로 (비우거나 모르는 값은 연구원)
function roleOf(s) {
  if (/초빙|visiting/i.test(s)) return 'visiting';
  if (/전임|full/i.test(s)) return 'fulltime';
  if (/박사후|포닥|postdoc/i.test(s)) return 'postdoc';
  if (/행정|staff|admin/i.test(s)) return 'staff';
  if (/대학원|학생|과정|student/i.test(s)) return 'student';
  if (/교수|faculty|professor/i.test(s)) return 'faculty';
  return 'researcher';
}

export function initMembers({ db, fs, email, toast }) {
  const $ = s => document.querySelector(s);
  const form = $('#memberForm');
  let people = [];   // { id, nameKo, ... }
  let editing = null;
  let photo = '';

  async function load() {
    try {
      const snap = await fs.getDocs(fs.collection(db, 'members'));
      people = sortMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast('구성원을 불러오지 못했어요.');
    }
    render();
  }

  function render() {
    const filter = $('#memberFilter');
    const r = filter.value;
    const q = $('#memberSearch').value.trim().toLowerCase();
    // 구분과 그룹을 한 칸에서 골라요 (그룹은 값 앞에 g:)
    filter.innerHTML = `<option value="">전체 (${people.length}명)</option>`
      + Object.entries(ROLES).map(([k, v]) => `<option value="${k}"${k === r ? ' selected' : ''}>${v.ko} (${people.filter(p => p.role === k).length}명)</option>`).join('')
      + Object.entries(GROUPS).map(([k, v]) => `<option value="g:${k}"${`g:${k}` === r ? ' selected' : ''}>${v.ko} (${people.filter(p => p.group === k).length}명)</option>`).join('');
    const pick = p => (!r || (r.startsWith('g:') ? p.group === r.slice(2) : p.role === r));
    const shown = people.filter(p => pick(p)
      && (!q || [p.nameKo, p.nameEn, p.deptKo].some(s => (s || '').toLowerCase().includes(q))));
    $('#memberRows').innerHTML = shown.length
      ? shown.map(p => `<tr data-id="${esc(p.id)}" tabindex="0">
          <td class="c-photo">${memberPhoto(p)}</td>
          <td>${esc(p.nameKo)}<small class="sub">${esc(p.nameEn || '')}</small></td>
          <td>${ROLES[p.role]?.ko || ''}${groupText(p) ? `<small class="sub">${esc(groupText(p))}</small>` : ''}</td>
          <td>${esc([p.deptKo, p.positionKo].filter(Boolean).join(' '))}</td>
          <td class="c-del"><button class="btn-s danger" type="button" data-del="${esc(p.id)}">삭제</button></td>
        </tr>`).join('')
      : `<tr><td colspan="5" class="msg">${people.length ? '찾는 사람이 없어요.' : '아직 구성원이 없어요. ‘세포·기질연구소 명단 가져오기’로 교수님들을 한 번에 넣을 수 있어요.'}</td></tr>`;
  }

  function showPhoto() {
    $('#memberPhoto').innerHTML = memberPhoto({ nameKo: form.elements.nameKo.value || '?', photo });
    $('#memberPhotoRemove').hidden = !photo;
  }

  function open(p) {
    editing = p || null;
    form.reset();
    const f = form.elements;
    for (const k of FIELDS) f[k].value = p?.[k] || '';
    f.role.value = p?.role || 'researcher';
    f.group.value = p?.group in GROUPS ? p.group : '';
    f.groupRole.value = p?.groupRole in GROUP_ROLES ? p.groupRole : '';
    f.order.value = Number.isInteger(p?.order) ? p.order : '';
    photo = p?.photo || '';
    showPhoto();
    $('#memberDialogTitle').textContent = p ? '구성원 고치기' : '구성원 추가';
    $('#deleteMemberBtn').hidden = !p;
    $('#memberDialog').showModal();
  }

  $('#memberFilter').addEventListener('change', render);
  $('#memberSearch').addEventListener('input', render);
  $('#addMemberBtn').addEventListener('click', () => open());
  // 줄 끝 삭제 단추는 바로 지우고, 나머지 자리를 누르면 고치기 창이 열려요
  $('#memberRows').addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) {
      remove(people.find(p => p.id === del.dataset.del));
      return;
    }
    const tr = e.target.closest('tr[data-id]');
    if (tr) open(people.find(p => p.id === tr.dataset.id));
  });
  $('#memberRows').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('tr[data-id]')) open(people.find(p => p.id === e.target.dataset.id));
  });

  $('#memberPhotoInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      photo = await shrinkPhoto(file);
      showPhoto();
    } catch (err) {
      console.error(err);
      toast('이 사진은 열 수 없어요. JPG나 PNG로 올려 주세요.');
    }
  });
  $('#memberPhotoRemove').addEventListener('click', () => {
    photo = '';
    showPhoto();
  });

  // 사진 여러 장: 파일 이름(확장자 빼고)이 이름이나 영문 이름과 같은 사람에게 넣어요. 같은 이름이 둘이면 건너뛰어요.
  $('#memberPhotosInput').addEventListener('change', async e => {
    const files = [...e.target.files];
    e.target.value = '';
    let done = 0;
    const missed = [];
    for (const file of files) {
      const name = file.name.normalize('NFC').replace(/\.[^.]*$/, '').trim();
      const found = people.filter(p => p.nameKo === name || (p.nameEn || '').toLowerCase() === name.toLowerCase());
      if (found.length !== 1) {
        missed.push(name);
        continue;
      }
      try {
        const shrunk = await shrinkPhoto(file);
        await fs.setDoc(fs.doc(db, 'members', found[0].id), { photo: shrunk, updatedAt: fs.serverTimestamp(), updatedBy: email }, { merge: true });
        found[0].photo = shrunk;
        done++;
      } catch (err) {
        console.error(err);
        missed.push(name);
      }
    }
    render();
    toast(missed.length ? `사진 ${done}장을 넣었어요. 못 넣은 파일: ${missed.join(', ')}` : `사진 ${done}장을 넣었어요.`);
  });

  form.addEventListener('submit', async e => {
    if (e.submitter?.value !== 'save') return;
    e.preventDefault();
    const f = form.elements;
    const data = Object.fromEntries(FIELDS.map(k => [k, f[k].value.trim()]));
    data.email = data.email.toLowerCase();
    if (!data.group) data.groupRole = '';   // 그룹이 없으면 역할도 없어요
    else if (!data.groupRole) data.groupRole = 'member';
    const order = Number(f.order.value);
    if (f.order.value !== '' && Number.isInteger(order) && order >= 1 && order <= 999) data.order = order;   // 비우면 순서 없음
    if (data.email && !isEmail(data.email)) {
      toast('이메일 주소를 확인해 주세요.');
      return;
    }
    const ref = editing ? fs.doc(db, 'members', editing.id) : fs.doc(fs.collection(db, 'members'));
    try {
      await fs.setDoc(ref, { ...data, photo, updatedAt: fs.serverTimestamp(), updatedBy: email });
      people = sortMembers([...people.filter(p => p.id !== ref.id), { id: ref.id, ...data, photo }]);
      render();
      $('#memberDialog').close();
      toast('저장했어요.');
    } catch (err) {
      console.error(err);
      toast('저장하지 못했어요. 다시 시도해 주세요.');
    }
  });

  async function remove(p) {
    if (!p || !confirm(`${p.nameKo}을(를) 구성원에서 지울까요?`)) return false;
    try {
      await fs.deleteDoc(fs.doc(db, 'members', p.id));
      people = people.filter(x => x.id !== p.id);
      render();
      toast(`${p.nameKo}을(를) 지웠어요.`);
      return true;
    } catch (err) {
      console.error(err);
      toast('지우지 못했어요. 다시 시도해 주세요.');
      return false;
    }
  }

  $('#deleteMemberBtn').addEventListener('click', async () => {
    if (await remove(editing)) $('#memberDialog').close();
  });

  // ---------- 세포·기질연구소 명단 가져오기 ----------
  // data/cmri-members.json: 세포·기질연구소 홈페이지의 참여교수·연구초빙교수(사진 포함)와, 그룹을 정해 둔 사업단 연구진 11명.
  // - 구성원이 하나도 없으면 모두 넣어요.
  // - 이미 있으면 지운 분이 다시 들어오지 않게 그룹 연구진만 봐요: 없는 사람은 넣고, 그룹이 비어 있는 사람은 그룹·역할을 채워요
  //   (연구 분야·사진·이메일이 비어 있으면 그것도). 그룹 연구진은 이름으로 찾아요.
  $('#memberSeedBtn').addEventListener('click', async () => {
    let rows;
    try {
      rows = await (await fetch('data/cmri-members.json')).json();
    } catch (err) {
      console.error(err);
      toast('명단 파일을 열지 못했어요.');
      return;
    }
    const first = !people.length;
    const add = [];
    const fill = [];   // [기존 사람, 고칠 값]
    for (const r of rows) {
      if (r.group) {
        const old = people.find(p => p.nameKo === r.nameKo);
        if (!old) add.push(r);
        else {
          const patch = {};
          if (!(old.group in GROUPS)) Object.assign(patch, { group: r.group, groupRole: r.groupRole });
          if (!old.researchKo) for (const k of RESEARCH) if (r[k]) patch[k] = r[k];
          if (!old.photo && r.photo) patch.photo = r.photo;
          if (!old.email && r.email) patch.email = r.email;
          if (Object.keys(patch).length) fill.push([old, patch]);
        }
      } else if (first) add.push(r);
    }
    if (!add.length && !fill.length) {
      toast('더 넣을 사람이 없어요. 그룹 연구진도 모두 들어 있어요.');
      return;
    }
    const todo = [add.length && `${add.length}명 새로 넣기`, fill.length && `${fill.length}명 빈 칸(그룹·사진 등) 채우기`].filter(Boolean).join(', ');
    const ask = first
      ? `세포·기질연구소 명단과 사업단 연구진 ${add.length}명을 가져올까요?`
      : `${todo}를 할까요?\n(지운 분이 다시 들어오지 않게 나머지 세포·기질연구소 명단은 건너뛰어요.)`;
    if (!confirm(ask)) return;
    try {
      const writes = [
        ...add.map(r => [fs.doc(fs.collection(db, 'members')), r, undefined]),
        ...fill.map(([old, patch]) => [fs.doc(db, 'members', old.id), patch, { merge: true }]),
      ];
      for (let i = 0; i < writes.length; i += 100) {
        const batch = fs.writeBatch(db);
        for (const [ref, data, opt] of writes.slice(i, i + 100)) {
          batch.set(ref, { ...data, updatedAt: fs.serverTimestamp(), updatedBy: email }, opt);
        }
        await batch.commit();
      }
      toast([add.length && `${add.length}명을 넣었어요.`, fill.length && `${fill.length}명의 빈 칸을 채웠어요.`].filter(Boolean).join(' '));
      load();
    } catch (err) {
      console.error(err);
      toast('가져오지 못했어요. Firestore 규칙을 새로 게시했는지 확인해 주세요.');
    }
  });

  // ---------- 엑셀에서 붙여 넣기 ----------
  // 한 줄에 이름 · 영문 이름 · 구분 · 직위 · 소속 · 이메일. 빈 칸은 원래 값을 그대로 둬요.
  const importForm = $('#memberImportForm');

  function parseRows() {
    const rows = new Map();   // 같은 사람이 두 번 있으면 아래 줄로
    for (const line of importForm.elements.rows.value.split(/\r?\n/)) {
      const c = (line.includes('\t') ? line.split('\t') : line.split(',')).map(x => x.trim());
      if (!c[0] || c[0] === '이름') continue;
      const row = { nameKo: c[0], nameEn: c[1], role: roleOf(c[2] || ''), positionKo: c[3], deptKo: c[4], email: (c[5] || '').toLowerCase() };
      if (!isEmail(row.email)) row.email = '';
      rows.set(`${row.nameKo}|${row.role}`, Object.fromEntries(Object.entries(row).filter(([, v]) => v)));
    }
    return [...rows.values()];
  }

  function preview() {
    const rows = parseRows();
    const added = rows.filter(r => !people.some(p => p.nameKo === r.nameKo && p.role === r.role)).length;
    $('#memberImportPreview').textContent = rows.length
      ? `${rows.length}명 · 새로 추가 ${added}명, 고침 ${rows.length - added}명`
      : '붙여 넣으면 몇 명인지 알려 드려요.';
  }

  $('#memberImportBtn').addEventListener('click', () => {
    importForm.reset();
    preview();
    $('#memberImportDialog').showModal();
  });
  importForm.addEventListener('input', preview);
  importForm.addEventListener('submit', async e => {
    if (e.submitter?.value !== 'save') return;
    e.preventDefault();
    const rows = parseRows();
    if (!rows.length) {
      toast('가져올 사람이 없어요.');
      return;
    }
    try {
      for (let i = 0; i < rows.length; i += 400) {
        const batch = fs.writeBatch(db);
        for (const r of rows.slice(i, i + 400)) {
          // 이름과 구분이 같은 사람이 있으면 그 사람을 고쳐요 (사진은 그대로)
          const old = people.find(p => p.nameKo === r.nameKo && p.role === r.role);
          const ref = old ? fs.doc(db, 'members', old.id) : fs.doc(fs.collection(db, 'members'));
          batch.set(ref, { ...r, updatedAt: fs.serverTimestamp(), updatedBy: email }, { merge: true });
        }
        await batch.commit();
      }
      $('#memberImportDialog').close();
      toast(`${rows.length}명을 가져왔어요.`);
      load();
    } catch (err) {
      console.error(err);
      toast('가져오지 못했어요. 다시 시도해 주세요.');
    }
  });

  load();
}
