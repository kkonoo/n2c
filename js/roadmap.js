// 연구 › 단계별 로드맵
// 오늘이 든 단계에 ‘진행 중’을 달고, 과제·단계에 마우스를 올리면 강조해요.
// 과제 이름 단추를 누르면 그 과제만 계속 강조하고, 한 번 더 누르면 풀려요.

const root = document.querySelector('.rmap');
if (root) {
  const phases = [...root.querySelectorAll('.rmap-phase')];
  const items = [...root.querySelectorAll('.rmap-items li')];
  const chips = [...root.querySelectorAll('.rmap-tracks button')];

  const month = s => { const [y, m] = s.split('-').map(Number); return y * 12 + m - 1; };
  const d = new Date(), now = d.getFullYear() * 12 + d.getMonth();
  phases.forEach(p => p.classList.toggle('now', month(p.dataset.start) <= now && now <= month(p.dataset.end)));

  let pinned = null;
  const show = t => {
    t = t || pinned;
    if (t) root.dataset.track = t; else delete root.dataset.track;
    items.forEach(li => li.classList.toggle('on', li.dataset.track === t));
    chips.forEach(b => b.classList.toggle('on', b.dataset.track === t));
  };

  chips.forEach(b => {
    b.addEventListener('pointerenter', () => show(b.dataset.track));
    b.addEventListener('pointerleave', () => show(null));
    b.addEventListener('click', () => {
      pinned = pinned === b.dataset.track ? null : b.dataset.track;
      chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.track === pinned)));
      show(null);
    });
  });
  items.forEach(li => {
    li.addEventListener('pointerenter', () => show(li.dataset.track));
    li.addEventListener('pointerleave', () => show(null));
  });
  phases.forEach(p => {
    p.addEventListener('pointerenter', () => { root.classList.add('phase-hot'); p.classList.add('hot'); });
    p.addEventListener('pointerleave', () => { root.classList.remove('phase-hot'); p.classList.remove('hot'); });
  });
}
