/* Dev screen nav — a burger button pinned top-right that opens a jump menu.
   Mounted once on <body>, outside #app, so it survives every screen swap
   (each mount* call replaces root.innerHTML). Only mounts when enabled. */

const SCREENS = [
  ['LOADING', 'BOOT'],
  ['ROSTER', 'ROSTER'],
  ['SCAN', 'SCAN'],
  ['RESULT', 'DOSSIER'],
  ['ARRIVALS', 'ARRIVALS'],
  ['ADMIN', 'ADMIN'],
];

export function mountDevNav({ onJump }) {
  const wrap = document.createElement('div');
  wrap.className = 'dev-nav';

  const burger = document.createElement('button');
  burger.type = 'button';
  burger.className = 'dev-nav-toggle';
  burger.setAttribute('aria-label', 'Screen menu');
  burger.setAttribute('aria-expanded', 'false');
  burger.innerHTML = '<span></span><span></span><span></span>';

  const menu = document.createElement('div');
  menu.className = 'dev-nav-menu';
  menu.hidden = true;
  menu.innerHTML = '<p>JUMP TO SCREEN</p>';

  for (const [id, label] of SCREENS) {
    const item = document.createElement('button');
    item.type = 'button';
    item.dataset.screen = id;
    item.textContent = label;
    menu.append(item);
  }

  function setOpen(open) {
    menu.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
  }

  burger.addEventListener('click', () => setOpen(menu.hidden));

  menu.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-screen]');
    if (!target) return;
    setOpen(false);
    onJump(target.dataset.screen);
  });

  wrap.append(burger, menu);
  document.body.append(wrap);

  return () => wrap.remove();
}
