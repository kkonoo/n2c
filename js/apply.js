// 공모·신청: 로그인 없이 누구나 종류별 신청서와 첨부 파일을 내요. 결과는 사업단이 신청자가 적은 연락처로 알려요.
// 신청서를 applications 컬렉션에 먼저 쓰고, 파일은 Storage applications/{신청 ID}/ 아래에 올려요
// (storage.rules가 신청서에 적힌 파일만 받아요).
import { enabled, firestore, storage } from './firebase.js';
import { bi, esc } from './posts.js';
import { GROUPS, TYPES } from './apply-types.js';

const $ = s => document.querySelector(s);
const MAX_FILES = 5;
const MAX_SIZE = 20 * 1024 * 1024;
const FILE_OK = /\.(pdf|jpe?g|png|hwpx?|docx?|xlsx?|pptx?)$/i;   // storage.rules와 같게
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;   // firestore.rules와 같게

const MSG = {
  setup: bi('아직 홈페이지 설정 중이에요. 사업단(053-420-4971, n2cglocal@knu.ac.kr)으로 문의해 주세요.', 'The site is still being set up. Please contact the N2C office at +82-53-420-4971 or n2cglocal@knu.ac.kr.'),
  email: bi('이메일 주소를 확인해 주세요. 결과를 이 주소로 알려 드려요.', 'Please check your email address. We’ll let you know the result there.'),
  tooMany: bi('파일은 5개까지 올릴 수 있어요.', 'You can attach up to 5 files.'),
  tooBig: bi('20MB가 넘는 파일이 있어요.', 'One of the files is larger than 20 MB.'),
  badFile: bi('올릴 수 없는 파일 형식이에요.', 'This file type can’t be uploaded.'),
  saving: bi('저장하는 중…', 'Saving…'),
  done: bi('신청했어요. 결과는 적어 주신 이메일이나 연락처로 알려 드려요. 다른 것도 이어서 신청할 수 있어요.',
    'Submitted. We’ll contact you by email or phone with the result. You can submit another one right away.'),
  submitFailed: bi('제출하지 못했어요. 잠시 후 다시 시도해 주세요. 계속 안 되면 n2cglocal@knu.ac.kr로 알려 주세요.', 'Couldn’t submit. Please try again in a moment, or email n2cglocal@knu.ac.kr if it keeps failing.'),
};

const gate = $('#applyGate');
const form = $('#applyForm');

function say(el, html = '', kind = '') {
  el.innerHTML = html;
  el.className = `form-msg ${kind}`;
}

const params = new URLSearchParams(location.search);
const startType = params.get('type') in TYPES ? params.get('type') : 'seed-pi';
// 고른 종류는 주소창에 남겨요 (그대로 링크로 보낼 수 있게)
const cleanUrl = type => location.pathname + (type ? `?type=${encodeURIComponent(type)}` : '') + location.hash;
const currentType = () => form.elements.type?.value || startType;

if (enabled) {
  gate.hidden = true;
  form.hidden = false;
  initForm();
} else {
  gate.innerHTML = `<p class="msg">${MSG.setup}</p>`;
}

// ---------- 신청서 ----------
function fieldHtml(f) {
  const label = bi(esc(f.ko), esc(f.en));
  const name = `d_${f.key}`;
  const req = f.required ? ' required' : '';
  if (f.kind === 'choice') {
    return `<fieldset class="field"><legend>${label}</legend><div class="choices">${f.options.map(([ko, en]) =>
      `<label><input type="radio" name="${name}" value="${esc(ko)}"${req}> ${bi(esc(ko), esc(en))}</label>`).join('')}</div></fieldset>`;
  }
  if (f.kind === 'check') return `<label class="check"><input type="checkbox" name="${name}" value="예"> ${label}</label>`;
  if (f.kind === 'textarea') return `<label class="field">${label}<textarea name="${name}" rows="4" maxlength="2000"${req}></textarea></label>`;
  return `<label class="field">${label}<input name="${name}" type="${f.kind === 'date' ? 'date' : 'text'}" maxlength="300"${req}></label>`;
}

function renderTypes(selected) {
  $('#typeChoices').innerHTML = Object.entries(GROUPS).map(([g, gl]) => `<div class="choice-group">
    <span class="choice-label">${bi(gl.ko, gl.en)}</span>
    <div class="choices">${Object.entries(TYPES).filter(([, t]) => t.group === g).map(([k, t]) =>
      `<label><input type="radio" name="type" value="${k}" required${k === selected ? ' checked' : ''}> ${bi(esc(t.ko), esc(t.en))}</label>`).join('')}</div>
  </div>`).join('');
}

function renderDetails(type) {
  const t = TYPES[type];
  $('#detailFields').innerHTML = t.fields.map(fieldHtml).join('');
  $('#fileHint').innerHTML = bi(esc(t.files[0]), esc(t.files[1]));
}

function checkFiles(list) {
  if (list.length > MAX_FILES) return MSG.tooMany;
  if (list.some(f => f.size > MAX_SIZE)) return MSG.tooBig;
  const bad = list.find(f => !FILE_OK.test(f.name));
  if (bad) return `${MSG.badFile} (${esc(bad.name)})`;
  return null;
}

function initForm() {
  const msg = $('#applyMsg');
  renderTypes(startType);
  renderDetails(startType);

  form.elements.files.addEventListener('change', () => say(msg));
  $('#typeChoices').addEventListener('change', () => {
    renderDetails(currentType());
    history.replaceState(null, '', cleanUrl(currentType()));
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const type = currentType();
    const t = TYPES[type];
    const f = form.elements;
    const email = f.email.value.trim().toLowerCase();
    if (!EMAIL_OK.test(email)) return say(msg, MSG.email, 'bad');
    const files = [...f.files.files];
    const fileProblem = checkFiles(files);
    if (fileProblem) return say(msg, fileProblem, 'bad');
    const details = {};
    for (const field of t.fields) {
      const el = f[`d_${field.key}`];
      const v = field.kind === 'check' ? (el.checked ? el.value : '') : String(el.value || '').trim();
      if (v) details[field.key] = v;
    }

    const button = $('#submitBtn');
    button.disabled = true;
    try {
      const { db, fs } = await firestore();
      const ref = fs.doc(fs.collection(db, 'applications'));
      // 파일 자리를 신청서에 먼저 적어요. Storage는 여기 적힌 경로·크기와 같은 파일만 받아요
      const declared = files.map((file, i) => ({
        name: file.name.slice(0, 200),
        path: `applications/${ref.id}/${i + 1}-${file.name.replace(/[\\/#?[\]*\u0000-\u001f]/g, '_').slice(-100)}`,
        size: file.size,
      }));
      const app = {
        email, type,
        name: f.name.value.trim(), position: f.position.value.trim(), dept: f.dept.value.trim(), phone: f.phone.value.trim(),
        details, memo: f.memo.value.trim(), files: declared,
        status: 'submitted', createdAt: fs.serverTimestamp(),
      };
      say(msg, MSG.saving);
      await fs.setDoc(ref, app);
      if (files.length) {
        const { storage: s, st } = await storage();
        for (const [i, file] of files.entries()) {
          say(msg, bi(`파일을 올리는 중… (${i + 1}/${files.length})`, `Uploading files… (${i + 1}/${files.length})`));
          await st.uploadBytes(st.ref(s, declared[i].path), file, { contentType: file.type || 'application/octet-stream' });
        }
      }
      // 신청자 칸은 두고 나머지만 비워서 이어서 낼 수 있게 해요
      renderDetails(type);
      f.memo.value = '';
      f.files.value = '';
      say(msg, MSG.done, 'ok');
    } catch (err) {
      console.error(err);
      say(msg, MSG.submitFailed, 'bad');
    }
    button.disabled = false;
  });
}
