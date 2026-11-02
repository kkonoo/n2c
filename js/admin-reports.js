// 관리자: 성과 입력 — 교수님 명단과 개인 링크, 실적 모아 보기(연·월 기간), 기간 합계, CSV
// 실적은 이 탭에서만 모아 봐요. 교수님은 개인 링크(report.html?k=…)로 자기 실적만 넣고 고쳐요.
import { esc } from './posts.js';
import { CATS, CAT, cellHTML, pretty, isTop10 } from './report-types.js';

const $ = s => document.querySelector(s);
const START_YEAR = 2026;   // 사업 시작 (2026.9)

export function initReports({ db, fs, toast }) {
  let reporters = [];   // { id, name, dept, key }
  let reports = [];     // { id, prof, cat, f, updatedAt }
  let loaded = false;

  const linkOf = k => new URL(`report.html?k=${k}`, location.href).href;
  const newKey = () => {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    return Array.from(crypto.getRandomValues(new Uint8Array(24)), b => abc[b % abc.length]).join('');
  };
  const when = r => r.updatedAt?.toDate?.() || null;
  const ymd = d => d ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}` : '';
  const profName = id => reporters.find(p => p.id === id)?.name || '(명단에 없음)';

  async function load() {
    $('#repRows').innerHTML = '<tr><td class="msg">불러오는 중…</td></tr>';
    try {
      const [ps, rs] = await Promise.all([fs.getDocs(fs.collection(db, 'reporters')), fs.getDocs(fs.collection(db, 'reports'))]);
      reporters = ps.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      reports = rs.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded = true;
    } catch (err) {
      console.error(err);
      $('#repRows').innerHTML = '<tr><td class="msg">불러오지 못했어요. Firestore 규칙을 다시 게시했는지 확인해 주세요.</td></tr>';
      return;
    }
    renderPeople();
    fillFilters();
    renderItems();
  }

  /* ---------- 교수님 명단과 링크 ---------- */
  function renderPeople() {
    $('#repRows').innerHTML = reporters.length ? reporters.map(p => {
      const mine = reports.filter(r => r.prof === p.id);
      const counts = CATS.map(c => [c.name, mine.filter(r => r.cat === c.key).length]).filter(([, n]) => n)
        .map(([name, n]) => `${esc(name)} ${n}`).join(' · ');
      const last = mine.map(when).filter(Boolean).sort((a, b) => b - a)[0];
      return `<tr>
        <td><b>${esc(p.name)}</b><span class="sub">${esc(p.dept || '')}</span></td>
        <td>${counts || '<span class="sub">아직 없음</span>'}</td>
        <td class="c-date">${ymd(last)}</td>
        <td class="c-link"><span class="actions">
          <button class="btn-s" type="button" data-copy="${p.id}">링크 복사</button>
          <a class="btn-s" href="${esc(linkOf(p.key))}" target="_blank" rel="noopener">열기</a>
          <button class="btn-s" type="button" data-rekey="${p.id}">새 링크</button>
        </span></td>
        <td class="c-del"><button class="btn-s danger" type="button" data-remove="${p.id}">삭제</button></td>
      </tr>`;
    }).join('') : '<tr><td class="msg">아직 명단이 없어요. <b>사업단 연구진 불러오기</b>나 아래 칸으로 넣어 주세요.</td></tr>';
  }

  // 교수님 한 분: reporters/{id}와 reportKeys/{토큰}을 함께 만들어요
  function addReporter(batch, name, dept) {
    const ref = fs.doc(fs.collection(db, 'reporters'));
    const key = newKey();
    batch.set(ref, { name, dept, key, createdAt: fs.serverTimestamp() });
    batch.set(fs.doc(db, 'reportKeys', key), { prof: ref.id, name });
    return { id: ref.id, name, dept, key };
  }

  $('#repAddForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const name = form.elements.name.value.trim();
    if (!name) return;
    const batch = fs.writeBatch(db);
    const p = addReporter(batch, name, form.elements.dept.value.trim());
    try {
      await batch.commit();
      reporters.push(p);
      reporters.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      form.reset();
      renderPeople();
      fillFilters();
      toast(`${name} 교수님을 넣었어요. 링크 복사를 눌러 보내 주세요.`);
    } catch (err) {
      console.error(err);
      toast('넣지 못했어요. 다시 시도해 주세요.');
    }
  });

  // 구성원 탭에서 그룹(1·2·3그룹·자율과제)을 정한 사업단 연구진
  $('#repSeedBtn').addEventListener('click', async () => {
    let members;
    try {
      members = (await fs.getDocs(fs.collection(db, 'members'))).docs.map(d => d.data()).filter(m => m.group);
    } catch (err) {
      console.error(err);
      toast('구성원 명단을 불러오지 못했어요.');
      return;
    }
    const have = new Set(reporters.map(p => p.name));
    const add = members.filter(m => !have.has(m.nameKo));
    if (!add.length) { toast(members.length ? '사업단 연구진은 모두 명단에 있어요.' : '구성원 탭에서 그룹을 정한 사람이 없어요.'); return; }
    if (!confirm(`${add.map(m => m.nameKo).join(', ')}\n${add.length}명을 넣을까요?`)) return;
    const batch = fs.writeBatch(db);
    const added = add.map(m => addReporter(batch, m.nameKo, m.deptKo || ''));
    try {
      await batch.commit();
      reporters.push(...added);
      reporters.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      renderPeople();
      fillFilters();
      toast(`${added.length}명을 넣었어요.`);
    } catch (err) {
      console.error(err);
      toast('넣지 못했어요. 다시 시도해 주세요.');
    }
  });

  async function copy(text, done) {
    try {
      await navigator.clipboard.writeText(text);
      toast(done);
    } catch {
      prompt('복사해 주세요', text);
    }
  }

  $('#repCopyAllBtn').addEventListener('click', () => {
    if (!reporters.length) return toast('명단이 비어 있어요.');
    copy(reporters.map(p => `${p.name}\t${linkOf(p.key)}`).join('\n'), '이름과 링크를 복사했어요. 엑셀에 붙여 넣을 수 있어요.');
  });

  $('#repRows').addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.copy) {
      const p = reporters.find(x => x.id === b.dataset.copy);
      return copy(linkOf(p.key), `${p.name} 교수님 링크를 복사했어요.`);
    }
    if (b.dataset.rekey) {
      const p = reporters.find(x => x.id === b.dataset.rekey);
      if (!confirm(`${p.name} 교수님 링크를 새로 만들까요?\n예전 링크는 바로 막혀요. 넣은 실적은 그대로예요.`)) return;
      const key = newKey();
      const batch = fs.writeBatch(db);
      batch.set(fs.doc(db, 'reportKeys', key), { prof: p.id, name: p.name });
      batch.update(fs.doc(db, 'reporters', p.id), { key });
      batch.delete(fs.doc(db, 'reportKeys', p.key));
      try {
        await batch.commit();
        p.key = key;
        renderPeople();
        copy(linkOf(key), '새 링크를 만들고 복사했어요.');
      } catch (err) {
        console.error(err);
        toast('새 링크를 만들지 못했어요.');
      }
      return;
    }
    if (b.dataset.remove) {
      const p = reporters.find(x => x.id === b.dataset.remove);
      const mine = reports.filter(r => r.prof === p.id);
      if (!confirm(`${p.name} 교수님을 명단에서 지울까요?\n링크가 막히고, 넣은 실적 ${mine.length}건도 함께 지워져요.`)) return;
      try {
        for (let i = 0; i < mine.length + 2; i += 400) {
          const batch = fs.writeBatch(db);
          if (i === 0) {
            batch.delete(fs.doc(db, 'reporters', p.id));
            batch.delete(fs.doc(db, 'reportKeys', p.key));
          }
          mine.slice(i, i + 400).forEach(r => batch.delete(fs.doc(db, 'reports', r.id)));
          await batch.commit();
        }
        reporters = reporters.filter(x => x.id !== p.id);
        reports = reports.filter(r => r.prof !== p.id);
        renderPeople();
        fillFilters();
        renderItems();
        toast('지웠어요.');
      } catch (err) {
        console.error(err);
        toast('지우지 못했어요. 다시 시도해 주세요.');
      }
    }
  });

  /* ---------- 실적 모아 보기 ---------- */
  // 기간은 연·월로 골라요 (연차가 3월–다음 해 2월이라서). 연도를 비우면 처음부터·지금까지
  const catSel = $('#repCat'), profSel = $('#repProf');
  const fromY = $('#repFromY'), fromM = $('#repFromM'), toY = $('#repToY'), toM = $('#repToM');
  catSel.innerHTML = CATS.map(c => `<option value="${c.key}">${esc(c.name)}</option>`).join('');
  const months = Array.from({ length: 12 }, (_, i) => `<option value="${String(i + 1).padStart(2, '0')}">${i + 1}월</option>`).join('');
  fromM.innerHTML = months;
  toM.innerHTML = months;
  toM.value = '12';

  function fillFilters() {
    const now = new Date().getFullYear();
    const ys = reports.map(monthOf).filter(m => /^\d{4}-\d{2}$/.test(m)).map(m => Number(m.slice(0, 4)));
    const lo = Math.min(START_YEAR, ...ys), hi = Math.max(now, ...ys);
    const years = Array.from({ length: hi - lo + 1 }, (_, i) => `<option>${lo + i}</option>`).join('');
    const keep = (sel, v, html) => { sel.innerHTML = html; if ([...sel.options].some(o => o.value === v)) sel.value = v; };
    keep(fromY, fromY.value, `<option value="">처음부터</option>${years}`);
    keep(toY, toY.value, `<option value="">지금까지</option>${years}`);
    keep(profSel, profSel.value, `<option value="">교수님 전체</option>${reporters.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}`);
    fromM.disabled = !fromY.value;
    toM.disabled = !toY.value;
  }

  // 실적의 연·월 (YYYY-MM). 논문은 게재 연월, 특허·기술이전·수상·언론은 날짜, 공동연구는 시작 연월
  const monthOf = r => String(CAT[r.cat]?.date(r.f || {}) || '').slice(0, 7);
  const range = () => ({ from: fromY.value ? `${fromY.value}-${fromM.value}` : '', to: toY.value ? `${toY.value}-${toM.value}` : '' });
  const label = ({ from, to }) => `${from ? pretty(from) : '처음'} ~ ${to ? pretty(to) : '지금'}`;

  // 인력양성은 그 기간에 참여한 사람 (입학·임용 ~ 졸업·끝이 기간과 겹치면)
  function inRange(r, { from, to }) {
    if (r.cat === 'people') {
      const admit = (r.f?.admit || '').slice(0, 7), grad = (r.f?.grad || '').slice(0, 7);
      return (!to || !admit || admit <= to) && (!from || !grad || grad >= from);
    }
    const m = monthOf(r);
    return (!from || (m && m >= from)) && (!to || (m && m <= to));
  }

  // 기간·교수님으로 거른 실적 (항목은 따로)
  function picked() {
    const rg = range(), prof = profSel.value;
    return reports.filter(r => (!prof || r.prof === prof) && inRange(r, rg));
  }

  function renderSummary(list) {
    const rg = range();
    const cols = [
      ['논문', r => r.cat === 'paper'],
      ['상위 10%', r => r.cat === 'paper' && isTop10(r.f || {})],
      ['특허 출원', r => r.cat === 'patent' && r.f?.kind === '출원'],
      ['특허 등록', r => r.cat === 'patent' && r.f?.kind === '등록'],
      ['기술이전', r => r.cat === 'transfer'],
      ['공동연구', r => r.cat === 'collab'],
      ['수상', r => r.cat === 'award'],
      ['언론 보도', r => r.cat === 'press'],
    ];
    $('#repSummary').innerHTML = `
      <thead><tr><th>기간</th>${cols.map(([n]) => `<th class="c-num">${n}</th>`).join('')}</tr></thead>
      <tbody><tr><td>${esc(label(rg))}</td>${cols.map(([, fn]) => `<td class="c-num">${list.filter(fn).length || '–'}</td>`).join('')}</tr></tbody>`;
    const people = list.filter(r => r.cat === 'people').map(r => r.f || {});
    const deg = d => people.filter(f => f.degree === d).length;
    const grad = people.filter(f => f.status === '졸업' && f.grad && (!rg.from || f.grad >= rg.from) && (!rg.to || f.grad <= rg.to)).length;
    $('#repPeople').textContent = people.length
      ? `인력양성: 이 기간에 참여한 ${people.length}명 — 석사 ${deg('석사')} · 박사 ${deg('박사') + deg('석박통합')} · 박사후연구원 ${deg('박사후연구원')} · 학부연구생 ${deg('학부연구생')} · 연구원 ${deg('연구원')}, 이 기간 졸업 ${grad}명`
      : '인력양성: 이 기간에 참여한 사람이 없어요.';
  }

  function renderItems() {
    if (!loaded) return;
    const base = picked();
    renderSummary(base);
    const c = CAT[catSel.value];
    const list = base.filter(r => r.cat === c.key)
      .sort((a, b) => (c.date(b.f || {}) || '').localeCompare(c.date(a.f || {}) || '') || profName(a.prof).localeCompare(profName(b.prof), 'ko'));
    $('#repItemCount').textContent = `${c.name} ${list.length}건`;
    $('#repItems').innerHTML = list.length ? list.map(r => `<tr tabindex="0" data-id="${r.id}">
        <td class="c-cat">${esc(profName(r.prof))}</td>
        <td>${cellHTML(r, esc)}</td>
        <td class="c-date">${ymd(when(r))}</td>
      </tr>`).join('') : '<tr><td class="msg">고른 조건에 맞는 실적이 없어요.</td></tr>';
  }

  [catSel, profSel, fromM, toM].forEach(s => s.addEventListener('change', renderItems));
  [fromY, toY].forEach(s => s.addEventListener('change', () => {
    fromM.disabled = !fromY.value;
    toM.disabled = !toY.value;
    renderItems();
  }));
  $('#repRefreshBtn').addEventListener('click', load);

  // 실적 하나 자세히 (모든 칸). 고치려면 그 교수님 링크를 열어요
  const dialog = $('#repDialog');
  let viewing = null;
  function view(r) {
    viewing = r;
    const c = CAT[r.cat], f = r.f || {};
    $('#repDialogTitle').textContent = `${c.name} · ${profName(r.prof)}`;
    $('#repInfo').innerHTML = c.fields.filter(fd => f[fd.k]).map(fd => {
      const v = esc(pretty(f[fd.k]));
      const val = fd.t === 'url' ? `<a href="${esc(f[fd.k])}" target="_blank" rel="noopener">${v}</a>`
        : fd.t === 'doi' ? `<a href="https://doi.org/${esc(f[fd.k])}" target="_blank" rel="noopener">${v}</a>` : v;
      return `<div><dt>${esc(fd.l)}</dt><dd>${val}</dd></div>`;
    }).join('') + `<div><dt>마지막 저장</dt><dd>${ymd(when(r)) || '-'}</dd></div>`;
    const p = reporters.find(x => x.id === r.prof);
    $('#repEditLink').hidden = !p;
    if (p) $('#repEditLink').href = linkOf(p.key);
    dialog.showModal();
  }
  $('#repItems').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-id]');
    if (tr) view(reports.find(r => r.id === tr.dataset.id));
  });
  $('#repItems').addEventListener('keydown', e => {
    const tr = e.target.closest('tr[data-id]');
    if (tr && e.key === 'Enter') view(reports.find(r => r.id === tr.dataset.id));
  });
  $('#repDeleteBtn').addEventListener('click', async () => {
    if (!viewing || !confirm('이 실적을 지울까요?')) return;
    try {
      await fs.deleteDoc(fs.doc(db, 'reports', viewing.id));
      reports = reports.filter(r => r.id !== viewing.id);
      dialog.close();
      renderPeople();
      renderItems();
      toast('지웠어요.');
    } catch (err) {
      console.error(err);
      toast('지우지 못했어요.');
    }
  });

  // 지금 고른 항목·기간·교수님을 CSV로 (엑셀에서 바로 열려요)
  $('#repCsvBtn').addEventListener('click', () => {
    if (!loaded) return;
    const c = CAT[catSel.value];
    const list = picked().filter(r => r.cat === c.key)
      .sort((a, b) => profName(a.prof).localeCompare(profName(b.prof), 'ko') || (c.date(a.f || {}) || '').localeCompare(c.date(b.f || {}) || ''));
    const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['교수님', '소속', ...c.fields.map(fd => fd.l), '마지막 저장'];
    const rows = list.map(r => {
      const p = reporters.find(x => x.id === r.prof) || {};
      return [p.name || '', p.dept || '', ...c.fields.map(fd => pretty(r.f?.[fd.k])), ymd(when(r))];
    });
    const lines = [head, ...rows].map(row => row.map(cell).join(','));
    const t = new Date(), p2 = n => String(n).padStart(2, '0');
    const rg = range();
    const span = rg.from || rg.to ? `_${rg.from ? pretty(rg.from) : '처음'}-${rg.to ? pretty(rg.to) : '지금'}` : '';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    link.download = `성과_${c.name}${span}_${t.getFullYear()}${p2(t.getMonth() + 1)}${p2(t.getDate())}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });

  // 성과 탭을 처음 열 때 불러와요
  document.addEventListener('admintab', e => { if (e.detail === 'reports' && !loaded) load(); });
}
