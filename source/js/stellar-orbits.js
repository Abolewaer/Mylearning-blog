/* An eight-orbit star for a small pause in the learning log. No storage or network requests. */
(() => {
  'use strict';
  const home = document.querySelector('.observatory');
  if (!home) return;
  const game = document.createElement('section');
  game.className = 'stellar-orbits';
  game.setAttribute('aria-label', '收集星辰，休息片刻');
  game.innerHTML = `<div class="stellar-sky"></div>
    <div class="stellar-vessel">
      <svg viewBox="0 0 160 160" aria-hidden="true">${Array.from({length: 8}, (_, i) => `<circle cx="80" cy="80" r="${12+i*8}"/>`).join('')}</svg>
      <span class="stellar-core" aria-hidden="true"></span>
      <div class="stellar-lights" aria-hidden="true"></div>
    </div>
    <span class="stellar-caption">一颗小小的恒星 <span class="stellar-count">0</span></span>
    <p class="stellar-hint" id="stellar-instructions">拖入星辰，让它成为卫星 · 点按也可以</p>
    <p class="stellar-message" role="status" aria-live="polite"></p>
    <div class="stellar-burst" aria-hidden="true"></div>`;
  home.append(game);
  const sky = game.querySelector('.stellar-sky');
  const vessel = game.querySelector('.stellar-vessel');
  vessel.removeAttribute('aria-hidden');
  vessel.setAttribute('role', 'button');
  vessel.setAttribute('tabindex', '0');
  vessel.setAttribute('aria-label', '吸引一颗背景星辰进入轨道');
  const pick = () => { if (!busy) document.dispatchEvent(new Event('star-pick')); };
  vessel.addEventListener('click', pick);
  vessel.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(); }
  });
  const lights = game.querySelector('.stellar-lights');
  const count = game.querySelector('.stellar-count');
  const message = game.querySelector('.stellar-message');
  const burst = game.querySelector('.stellar-burst');
  let collected = 0, busy = false, target = 3;
  document.addEventListener('star-population', event => {
    target = Math.ceil(event.detail / 2);
    count.textContent = `${collected} / ${target}`;
    game.title = `这一轮共有 ${event.detail} 颗星辰，收集 ${target} 颗后绽放`;
  });
  document.addEventListener('star-captured', () => collect());
  document.dispatchEvent(new Event('star-population-request'));
  const positions = [[4, 27], [45, 0], [97, 5], [205, 12], [224, 78], [18, 118]];
  function collect(star) {
    if (busy || star?.disabled) return;
    if (star) {
      star.disabled = true;
      star.classList.add('is-collected');
    }
    collected++;
    count.textContent = `${collected} / ${target}`;
    const light = document.createElement('i');
    light.style.cssText = `--radius:${12 + ((collected - 1) % 8) * 8}px;--angle:${collected * 137.5}deg;--period:${18 + ((collected - 1) % 8) * 5}s`;
    lights.append(light);
    message.textContent = `已收集 ${collected} 颗星星`;
    if (collected < target) return;
    busy = true;
    game.classList.add('is-gathering');
    setTimeout(() => {
      game.classList.remove('is-gathering');
      game.classList.add('is-blooming');
      lights.replaceChildren();
      for (let i = 0; i < 40; i++) {
        const spark = document.createElement('i');
        const angle = i * Math.PI * (3 - Math.sqrt(5));
        const radius = 35 + (i % 7) * 13;
        spark.style.cssText = `--dx:${Math.cos(angle) * radius}px;--dy:${Math.sin(angle) * radius * .7}px;--delay:${i % 4 * 35}ms`;
        burst.append(spark);
      }
      message.textContent = '放松结束，现在是学习时间';
    }, 650);
    setTimeout(() => {
      game.classList.remove('is-blooming');
      burst.replaceChildren();
      collected = 0;
      busy = false;
      document.dispatchEvent(new Event('star-reset'));
      count.textContent = `0 / ${target}`;
      populate();
    }, 4800);
    setTimeout(() => { if (!collected) message.textContent = ''; }, 8500);
  }
  function populate() {
    // Reuse the six foreground star controls for the next round.
    if (sky.children.length) {
      for (const star of sky.children) { star.disabled = false; star.classList.remove('is-collected'); }
      return;
    }
    positions.forEach(([x, y], index) => {
      const star = document.createElement('button');
      star.type = 'button';
      star.className = 'stellar-star';
      star.style.cssText = `left:${x}px;top:${y}px`;
      star.setAttribute('aria-label', `收集第 ${index + 1} 颗星星`);
      star.setAttribute('aria-describedby', 'stellar-instructions');
      star.innerHTML = '<span aria-hidden="true">✦</span>';
      let drag = null, suppressClick = false;
      function clear() {
        drag = null;
        star.style.transform = '';
        star.classList.remove('is-dragging');
        vessel.classList.remove('is-near');
      }
      function inside(event) {
        const r = vessel.getBoundingClientRect();
        return event.clientX >= r.left - 12 && event.clientX <= r.right + 12 && event.clientY >= r.top - 12 && event.clientY <= r.bottom + 12;
      }
      star.addEventListener('pointerdown', event => {
        if (busy || event.button !== 0) return;
        suppressClick = false;
        drag = { x: event.clientX, y: event.clientY, moved: false };
        star.setPointerCapture(event.pointerId);
        star.classList.add('is-dragging');
      });
      star.addEventListener('pointermove', event => {
        if (!drag) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        drag.moved ||= Math.hypot(dx, dy) > 5;
        star.style.transform = `translate(${dx}px, ${dy}px)`;
        vessel.classList.toggle('is-near', inside(event));
      });
      star.addEventListener('pointerup', event => {
        if (!drag) return;
        const moved = drag.moved;
        const accepted = moved && inside(event);
        suppressClick = moved;
        clear();
        if (accepted) collect(star);
      });
      star.addEventListener('pointercancel', () => { suppressClick = true; clear(); });
      star.addEventListener('lostpointercapture', clear);
      star.addEventListener('click', event => {
        if (event.detail === 0 || !suppressClick) collect(star);
        suppressClick = false;
      });
      sky.append(star);
    });
  }
  populate();
})();
