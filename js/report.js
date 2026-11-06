// 성과 입력 (report.html?k=개인 토큰): 교수님이 로그인 없이 자기 성과를 넣고 고쳐요.
// 링크를 열면 익명으로 로그인하고 reportSessions/{uid}에 토큰을 적어요. Firestore 규칙이 그 토큰의
// 교수님 자료만 읽고 쓰게 해요. 관리자가 로그인한 채 열면 관리자 권한으로 그 교수님 자료를 고쳐요.
import { enabled, auth, firestore } from './firebase.js';
import { esc } from './posts.js';
import { GROUPS, CATS, CAT, cellHTML, fieldHTML, pretty } from './report-types.js';

const $ = s => document.querySelector(s);
const gate = $('#gate');
const key = (new URLSearchParams(location.search).get('k') || '').trim();

let toastTimer;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
}

function showGate(title, text) {
  gate.innerHTML = `<div class="gate-box"><h1>${title}</h1><p>${text}</p></div>`;
  gate.hidden = false;
  $('#app').hidden = true;
}

if (!enabled) {
  showGate('준비 중이에요', '사업단 홈페이지 설정이 끝나면 열려요.');
} else if (!/^[A-Za-z0-9_-]{20,64}$/.test(key)) {
  showGate('개인 링크로 들어와 주세요', '사업단에서 받은 교수님별 링크를 그대로 열어 주세요.');
} else {
  start().catch(err => {
    console.error(err);
    const off = ['auth/operation-not-allowed', 'auth/admin-restricted-operation'].includes(err.code);
    showGate('열지 못했어요', off
      ? '사업단 홈페이지에서 링크 접속이 아직 켜져 있지 않아요. 사업단(053-420-4971)에 알려 주세요.'
      : '잠시 후 새로 고침해 주세요. 계속 안 되면 사업단(053-420-4971)에 알려 주세요.');
  });
}

async function start() {
  const [{ auth: a, fa }, { db, fs }] = await Promise.all([auth(), firestore()]);
  await a.authStateReady();
  const user = a.currentUser || (await fa.signInAnonymously(a)).user;

  let info = null;
  try {
    const snap = await fs.getDoc(fs.doc(db, 'reportKeys', key));
    if (snap.exists()) info = snap.data();
  } catch (err) {
    console.error(err);
  }
  if (!info) {
    showGate('링크가 맞지 않아요', '링크가 바뀌었거나 지워졌을 수 있어요. 사업단(053-420-4971)에 새 링크를 부탁해 주세요.');
    return;
  }
  if (user.isAnonymous) await fs.setDoc(fs.doc(db, 'reportSessions', user.uid), { k: key, at: fs.serverTimestamp() });

  const pid = info.prof;
  $('#who').textContent = `${info.name} 교수님 성과 입력`;
  document.title = `${info.name} 교수님 성과 입력 | 천연나노융합사업단`;

  const snap = await fs.getDocs(fs.query(fs.collection(db, 'reports'), fs.where('prof', '==', pid)));
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  let cat = CATS[0].key;
  let editing = null;   // 고치는 실적 (새로 넣을 때는 null)

  const when = r => r.updatedAt?.toDate ? r.updatedAt.toDate() : new Date();
  const ymd = d => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const sortKey = r => CAT[r.cat].date(r.f || {}) || '';

  function render() {
    // 왼쪽 탭은 정량성과 양식의 구분(연구성과·인재양성·…)으로 묶어요
    const tab = c => {
      const n = items.filter(r => r.cat === c.key).length;
      return `<button type="button" data-cat="${c.key}"${c.key === cat ? ' class="on"' : ''}>${esc(c.name)}${n ? ` <span class="count">${n}</span>` : ''}</button>`;
    };
    $('#catTabs').innerHTML = GROUPS.map(g => `<span class="side-group">${esc(g)}</span>${CATS.filter(c => c.group === g).map(tab).join('')}`).join('');
    const c = CAT[cat];
    $('#catRule').innerHTML = c.rule;
    $('#addBtn').textContent = `${c.name} 추가`;
    const list = items.filter(r => r.cat === cat).sort((x, y) => sortKey(y).localeCompare(sortKey(x)));
    $('#itemRows').innerHTML = list.length
      ? list.map(r => `<tr tabindex="0" data-id="${r.id}">
          <td>${cellHTML(r, esc)}</td>
          <td class="c-date">${ymd(when(r))} 저장</td>
          <td class="c-del"><button class="btn-s danger" type="button" data-del="${r.id}">삭제</button></td>
        </tr>`).join('')
      : `<tr><td class="msg">아직 넣은 것이 없어요. 오른쪽 위 <b>${esc(c.name)} 추가</b>를 눌러 주세요.</td></tr>`;
  }

  const dialog = $('#itemDialog');
  const form = $('#itemForm');

  function openForm(r) {
    editing = r || null;
    const c = CAT[cat];
    $('#itemDialogTitle').textContent = `${c.name} ${r ? '고치기' : '추가'}`;
    $('#itemFields').innerHTML = c.fields.map(fd => fieldHTML(fd, r?.f?.[fd.k], esc)).join('');
    $('#deleteItemBtn').hidden = !r;
    dialog.showModal();
  }

  async function remove(r) {
    const c = CAT[r.cat];
    if (!confirm(`${c.name}에서 지울까요?\n${c.title(r.f || {}) || ''}`)) return false;
    try {
      await fs.deleteDoc(fs.doc(db, 'reports', r.id));
      items = items.filter(x => x.id !== r.id);
      render();
      toast('지웠어요.');
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  }

  function fail(err) {
    console.error(err);
    toast(err?.code === 'permission-denied'
      ? '저장하지 못했어요. 다른 교수님 링크를 열었다면 이 페이지를 새로 고침해 주세요.'
      : '저장하지 못했어요. 인터넷 연결을 확인해 주세요.');
  }

  $('#catTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    cat = b.dataset.cat;
    render();
  });
  $('#addBtn').addEventListener('click', () => openForm(null));
  $('#itemRows').addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) return void remove(items.find(x => x.id === del.dataset.del));
    const tr = e.target.closest('tr[data-id]');
    if (tr) openForm(items.find(x => x.id === tr.dataset.id));
  });
  $('#itemRows').addEventListener('keydown', e => {
    const tr = e.target.closest('tr[data-id]');
    if (tr && e.key === 'Enter') openForm(items.find(x => x.id === tr.dataset.id));
  });
  $('#deleteItemBtn').addEventListener('click', async () => {
    if (editing && await remove(editing)) dialog.close();
  });
  form.addEventListener('click', e => { if (e.target.closest('[data-doi]')) doiFill(); });

  form.addEventListener('submit', async e => {
    if (e.submitter?.value !== 'save') return;   // 취소는 그냥 닫혀요
    e.preventDefault();
    const c = CAT[cat];
    const f = {};
    c.fields.forEach(fd => {
      const v = (form.elements[fd.k].value || '').trim();
      if (v) f[fd.k] = v;
    });
    if (f.doi) f.doi = cleanDoi(f.doi);
    const btn = e.submitter;
    btn.disabled = true;
    try {
      if (editing) {
        await fs.updateDoc(fs.doc(db, 'reports', editing.id), { f, updatedAt: fs.serverTimestamp() });
        Object.assign(editing, { f, updatedAt: null });
      } else {
        const data = { prof: pid, cat, f, createdAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp() };
        const ref = await fs.addDoc(fs.collection(db, 'reports'), data);
        items.push({ id: ref.id, ...data, updatedAt: null });
      }
      dialog.close();
      render();
      toast('저장했어요.');
    } catch (err) {
      fail(err);
    } finally {
      btn.disabled = false;
    }
  });

  // DOI로 논문 정보 채우기 (Crossref)
  const cleanDoi = v => v.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
  async function doiFill() {
    const el = form.elements.doi, msg = $('#doiMsg');
    const doi = cleanDoi(el.value || '');
    if (!doi) { msg.textContent = 'DOI를 먼저 넣어 주세요.'; return; }
    msg.textContent = '찾는 중…';
    try {
      const res = await fetch('https://api.crossref.org/works/' + encodeURIComponent(doi));
      if (!res.ok) throw new Error(res.status);
      const m = (await res.json()).message;
      const dp = (m.published || m.issued)?.['date-parts']?.[0] || [];
      const set = (k, v) => { if (v && form.elements[k]) form.elements[k].value = v; };
      el.value = doi;
      set('title', (m.title || [])[0]);
      set('journal', (m['container-title'] || [])[0]);
      set('ym', dp[0] ? `${dp[0]}-${String(dp[1] || 1).padStart(2, '0')}` : '');
      set('vol', m.volume ? m.volume + (m.issue ? `(${m.issue})` : '') : '');
      set('pages', m.page || m['article-number'] || '');
      msg.textContent = `채웠어요 (${pretty(form.elements.ym.value)}). 저자 역할·JCR 상위 %·사사 표기를 골라 주세요.`;
    } catch (err) {
      console.error(err);
      msg.textContent = '찾지 못했어요. DOI를 확인하거나 직접 넣어 주세요.';
    }
  }

  gate.hidden = true;
  $('#app').hidden = false;
  render();
}
