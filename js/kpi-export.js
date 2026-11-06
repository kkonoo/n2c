// 정량성과 양식 내려받기: 글로컬랩 사업단 정량성과 집계 양식(data/kpi-form.xlsx·pptx)에 값을 채워 받아요.
// 양식의 서식·수식·다른 시트는 그대로 두고, 값이 들어갈 칸만 고쳐요.
// - 엑셀: 사업단입력 시트의 사업단명, 연도별 값(7–20행, 2026–2035년 열), 기준연도
// - 파워포인트: 1쪽 기준연도 값(‘값_…’ 상자), 2쪽 최근 4년 표
// 연도는 사업연도(3월 ~ 다음 해 2월)로 나눠요. 예: 2026년 = 2026.03 ~ 2027.02 (1차년도 2026.09 ~ 2027.02가 여기에 들어가요)
// xlsx·pptx는 zip이라 JSZip을 처음 받을 때 불러와요.
import { KPIS } from './report-types.js';

export const CENTER = '천연나노융합사업단';
export const FIRST_YEAR = 2026, LAST_YEAR = 2035;
const YEAR_START = 3;   // 사업연도 시작 월

const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';

let zipLib = null;
function loadZip() {
  zipLib ||= new Promise((ok, no) => {
    if (window.JSZip) return ok(window.JSZip);
    const s = document.createElement('script');
    s.src = JSZIP_URL;
    s.onload = () => ok(window.JSZip);
    s.onerror = () => { zipLib = null; no(new Error('JSZip을 불러오지 못했어요')); };
    document.head.append(s);
  });
  return zipLib;
}

// 사업연도 y와 고른 기간(from ~ to, YYYY-MM)이 겹치는 부분. 안 겹치면 null (양식에서는 빈칸 = 미조사)
export function yearWindow(y, from, to) {
  const a = `${y}-${String(YEAR_START).padStart(2, '0')}`, b = `${y + 1}-${String(YEAR_START - 1).padStart(2, '0')}`;
  const lo = from && from > a ? from : a, hi = to && to < b ? to : b;
  return lo <= hi ? [lo, hi] : null;
}

// YYYY-MM이 든 사업연도 (양식의 연도 범위 안으로)
export function yearOf(m) {
  const y = Number(m.slice(0, 4)) - (Number(m.slice(5, 7)) < YEAR_START ? 1 : 0);
  return Math.min(LAST_YEAR, Math.max(FIRST_YEAR, y));
}

// 연도별 14개 값: { 2026: [값…] 또는 null, … }. valuesOf(from, to)는 그 기간의 14개 값을 돌려줘요
export function yearValues(valuesOf, from, to) {
  const out = {};
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    const w = yearWindow(y, from, to);
    out[y] = w ? valuesOf(w[0], w[1]) : null;
  }
  return out;
}

const fmt = (k, v) => (v === null || v === undefined || v === '' ? '' : k.unit === '억원' ? Number(v).toFixed(1) : String(v));

async function open(url) {
  const JSZip = await loadZip();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return JSZip.loadAsync(await res.arrayBuffer());
}
const parse = async (zip, path) => new DOMParser().parseFromString(await zip.file(path).async('string'), 'application/xml');
function put(zip, path, doc) {
  let xml = new XMLSerializer().serializeToString(doc);
  if (!xml.startsWith('<?xml')) xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xml;
  zip.file(path, xml);
}

/* ---------- 엑셀 ---------- */
const colNum = ref => [...ref.replace(/\d+$/, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const colName = n => (n > 26 ? colName(Math.floor((n - 1) / 26)) : '') + String.fromCharCode(65 + ((n - 1) % 26));

// 시트의 칸 (없으면 행·칸 순서에 맞춰 만들어요)
function cellOf(doc, ref) {
  const NS = doc.documentElement.namespaceURI;
  const rowNo = Number(ref.replace(/^[A-Z]+/, '')), col = colNum(ref);
  const data = doc.getElementsByTagNameNS(NS, 'sheetData')[0];
  let row = [...data.children].find(r => Number(r.getAttribute('r')) === rowNo);
  if (!row) {
    row = doc.createElementNS(NS, 'row');
    row.setAttribute('r', rowNo);
    data.insertBefore(row, [...data.children].find(r => Number(r.getAttribute('r')) > rowNo) || null);
  }
  let c = [...row.children].find(x => x.getAttribute('r') === ref);
  if (!c) {
    c = doc.createElementNS(NS, 'c');
    c.setAttribute('r', ref);
    row.insertBefore(c, [...row.children].find(x => colNum(x.getAttribute('r')) > col) || null);
  }
  return c;
}

// 숫자는 그대로, 글은 칸 안에 바로 (서식 s는 그대로 둬요). null이면 비워요
function setCell(doc, ref, v) {
  const NS = doc.documentElement.namespaceURI;
  const c = cellOf(doc, ref);
  c.removeAttribute('t');
  while (c.firstChild) c.firstChild.remove();
  if (v === null || v === undefined || v === '') return;
  if (typeof v === 'number') {
    const el = doc.createElementNS(NS, 'v');
    el.textContent = String(v);
    c.append(el);
  } else {
    c.setAttribute('t', 'inlineStr');
    const is = doc.createElementNS(NS, 'is'), t = doc.createElementNS(NS, 't');
    t.textContent = v;
    is.append(t);
    c.append(is);
  }
}

export async function buildXlsx({ years, base, center = CENTER }) {
  const zip = await open('data/kpi-form.xlsx');
  const wb = await parse(zip, 'xl/workbook.xml');
  const rels = await parse(zip, 'xl/_rels/workbook.xml.rels');
  const sheet = [...wb.getElementsByTagName('sheet')].find(s => s.getAttribute('name') === '사업단입력');
  const rel = [...rels.getElementsByTagName('Relationship')].find(r => r.getAttribute('Id') === sheet.getAttribute('r:id'));
  const path = 'xl/' + rel.getAttribute('Target').replace(/^\/?(xl\/)?/, '');
  const doc = await parse(zip, path);
  const NS = doc.documentElement.namespaceURI;

  setCell(doc, 'A1', `${center} 연차별 성과 집계표`);
  setCell(doc, 'B4', center);
  KPIS.forEach((k, i) => {
    for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
      const v = years[y] ? years[y][i] : null;
      setCell(doc, `${colName(4 + y - FIRST_YEAR)}${7 + i}`, v);
    }
  });
  setCell(doc, 'B24', base);
  // 수식 칸의 예전 계산값은 지우고, 열 때 다시 계산하게 해요
  [...doc.getElementsByTagNameNS(NS, 'f')].forEach(f => [...f.parentNode.getElementsByTagNameNS(NS, 'v')].forEach(v => v.remove()));
  put(zip, path, doc);
  const calc = wb.getElementsByTagName('calcPr')[0];
  if (calc) {
    calc.setAttribute('fullCalcOnLoad', '1');
    put(zip, 'xl/workbook.xml', wb);
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/* ---------- 파워포인트 ---------- */
const shapeNamed = (doc, name) => [...doc.getElementsByTagNameNS(P, 'sp')]
  .find(sp => sp.getElementsByTagNameNS(P, 'cNvPr')[0]?.getAttribute('name') === name);

// 상자 안 글을 바꿔요: 첫 글 조각에 text, 나머지 조각은 비워요
function setShapeText(sp, text) {
  [...sp.getElementsByTagNameNS(A, 't')].forEach((t, i) => { t.textContent = i ? '' : text; });
}
const replaceText = (root, from, to) => [...root.getElementsByTagNameNS(A, 't')].forEach(t => { t.textContent = t.textContent.split(from).join(to); });

// 빈 표 칸에 글을 넣어요 (칸의 글꼴·크기는 그대로, 글자는 흰색)
function setTableCell(doc, tc, text, bold) {
  if (!text) return;
  const p = tc.getElementsByTagNameNS(A, 'p')[0];
  const end = p.getElementsByTagNameNS(A, 'endParaRPr')[0];
  const r = doc.createElementNS(A, 'a:r'), rPr = doc.createElementNS(A, 'a:rPr');
  rPr.setAttribute('lang', 'ko-KR');
  if (end?.getAttribute('sz')) rPr.setAttribute('sz', end.getAttribute('sz'));
  if (bold) rPr.setAttribute('b', '1');
  rPr.setAttribute('dirty', '0');
  const fill = doc.createElementNS(A, 'a:solidFill'), clr = doc.createElementNS(A, 'a:schemeClr');
  clr.setAttribute('val', 'bg1');
  fill.append(clr);
  rPr.append(fill);
  if (end) [...end.children].forEach(ch => rPr.append(ch.cloneNode(true)));   // latin·ea·cs 글꼴
  const t = doc.createElementNS(A, 'a:t');
  t.textContent = text;
  r.append(rPr, t);
  p.insertBefore(r, end || null);
}

export async function buildPptx({ years, base, center = CENTER }) {
  const zip = await open('data/kpi-form.pptx');

  // 1쪽: 기준연도 값
  const s1 = await parse(zip, 'ppt/slides/slide1.xml');
  replaceText(s1, '*** 센터', center);
  replaceText(s1, '20○○', String(base));
  const now = years[base];
  KPIS.forEach((k, i) => {
    const sp = shapeNamed(s1, `값_${k.key}`);
    if (sp) setShapeText(sp, now ? fmt(k, now[i]) : '-');
  });
  put(zip, 'ppt/slides/slide1.xml', s1);

  // 2쪽: 최근 4년 (N-3 ~ N)과 4년 합계. 사업기간 전은 "-", 조사하지 않은 해는 빈칸
  const s2 = await parse(zip, 'ppt/slides/slide2.xml');
  replaceText(s2, '*** 센터', center);
  const title = shapeNamed(s2, 'Text 0');
  if (title) [...title.getElementsByTagNameNS(A, 'rPr')].forEach(r => r.setAttribute('sz', '3200'));   // 사업단 이름이 길어 한 줄에 맞춰요
  const four = [base - 3, base - 2, base - 1, base];
  const rows = [...s2.getElementsByTagNameNS(A, 'tr')];
  const cellsOf = tr => [...tr.children].filter(el => el.localName === 'tc');
  cellsOf(rows[0]).slice(3, 7).forEach((tc, j) => replaceText(tc, '20○○', String(four[j])));
  KPIS.forEach((k, i) => {
    const cells = cellsOf(rows[i + 1]);
    const vals = four.map(y => (y < FIRST_YEAR ? '-' : years[y] ? years[y][i] : ''));
    vals.forEach((v, j) => setTableCell(s2, cells[3 + j], v === '-' ? '-' : fmt(k, v)));
    const nums = vals.filter(v => typeof v === 'number');
    setTableCell(s2, cells[7], nums.length ? fmt(k, nums.reduce((a, b) => a + b, 0)) : '', true);
  });
  put(zip, 'ppt/slides/slide2.xml', s2);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}

export function save(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
