// 사업단 소개 › 참여 기관 지도 (대구, 미국)
// 지도의 점·권역이나 목록에 마우스를 올리면 서로 강조하고, 지도에서는 설명 카드를 띄워요.
// 휴대폰에서는 점을 누르면 카드가 열리고, 다른 곳을 누르면 닫혀요.

document.querySelectorAll('.pmap').forEach(root => {
  const svg = root.querySelector('.pmap-svg');
  const canvas = root.querySelector('.pmap-canvas');
  const card = root.querySelector('.pmap-card');
  const items = [...root.querySelectorAll('.pm-items [data-site]')];
  const marks = [...svg.querySelectorAll('.pin, .zone')];
  const mapEls = [...svg.querySelectorAll('[data-site]')];
  const sitesOf = el => el.dataset.site.split(' ');
  let pinned = null;

  // sites에 든 기관을 강조해요. 지도에서 고른 때만 목록도 같이 강조해요.
  function light(sites, withList) {
    const hit = el => !!sites && sitesOf(el).some(s => sites.includes(s));
    svg.classList.toggle('hot', !!sites);
    mapEls.forEach(el => el.classList.toggle('on', hit(el)));
    items.forEach(el => el.classList.toggle('on', !!withList && hit(el)));
  }

  function show(mark) {
    const site = mark.dataset.site;
    light([site], true);
    card.innerHTML = items.filter(li => sitesOf(li).includes(site))
      .map(li => `<div>${li.querySelector('div').innerHTML}</div>`).join('');
    card.hidden = false;
    const box = canvas.getBoundingClientRect();
    const r = mark.querySelector('.zone-area, .pin-b').getBoundingClientRect();
    const w = card.offsetWidth, h = card.offsetHeight;
    const x = r.left + r.width / 2 - box.left;
    let top = r.top - box.top - h - 10;
    if (top < 8) top = r.bottom - box.top + 10;
    card.style.left = Math.min(Math.max(x - w / 2, 8), box.width - w - 8) + 'px';
    card.style.top = Math.min(top, box.height - h - 8) + 'px';
  }

  function hide() {
    pinned = null;
    light(null);
    card.hidden = true;
  }

  marks.forEach(mark => {
    mark.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !pinned) show(mark); });
    mark.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !pinned) hide(); });
    mark.addEventListener('focus', () => show(mark));
    mark.addEventListener('blur', () => { if (!pinned) hide(); });
    mark.addEventListener('click', e => {
      e.stopPropagation();
      if (pinned === mark) return hide();
      show(mark);
      pinned = mark;
    });
    mark.addEventListener('keydown', e => { if (e.key === 'Escape') { hide(); mark.blur(); } });
  });
  document.addEventListener('click', () => { if (pinned) hide(); });

  items.forEach(li => {
    const on = () => { if (!pinned) light(sitesOf(li), false); };
    const off = () => { if (!pinned) light(null); };
    li.addEventListener('pointerenter', on);
    li.addEventListener('pointerleave', off);
    li.addEventListener('focus', on);
    li.addEventListener('blur', off);
  });
});
