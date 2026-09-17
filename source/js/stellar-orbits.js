/* An eight-orbit star for a small pause in the learning log. No storage or network requests. */
(() => {
  'use strict';
  const home = document.querySelector('.observatory');
  if (!home) return;
  const game = document.createElement('section');
  game.className = 'stellar-orbits';
  game.setAttribute('aria-label', '收集星辰，休息片刻');
  game.innerHTML = `
    <div class="stellar-vessel">
      <svg viewBox="0 0 160 160" aria-hidden="true">${Array.from({length: 8}, (_, i) => `<circle cx="80" cy="80" r="${12+i*8}"/>`).join('')}</svg>
      <span class="stellar-core" aria-hidden="true"></span>
      <div class="stellar-lights" aria-hidden="true"></div>
    </div>
    <span class="stellar-caption">一颗小小的恒星 <span class="stellar-count">0</span></span>
    <p class="stellar-hint" id="stellar-instructions">移动鼠标引导星辰，靠近恒星自动入轨</p>
    <p class="stellar-message" role="status" aria-live="polite"></p>
    <div class="stellar-burst" aria-hidden="true"></div>`;
  home.append(game);
  const sky = game.querySelector('.stellar-sky');
  const vessel = game.querySelector('.stellar-vessel');
  vessel.setAttribute('aria-label', '星辰吸附区域');
  const lights = game.querySelector('.stellar-lights');
  const lanes = Array.from({ length: 8 }, (_, index) => {
    const lane = document.createElement('div');
    lane.className = 'stellar-lane';
    lane.style.setProperty('--period', `${18 + index * 5}s`);
    lights.append(lane);
    return lane;
  });
  let visible = true;
  const pause = () => game.classList.toggle('orbits-paused', !visible || document.hidden);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    pause();
  }).observe(game);
  document.addEventListener('visibilitychange', pause);
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
    lanes[(collected - 1) % 8].append(light);
    message.textContent = `已收集 ${collected} 颗星星`;
    if (collected < target) return;
    busy = true;
    game.classList.add('is-gathering');
    setTimeout(() => {
      game.classList.remove('is-gathering');
      game.classList.add('is-blooming');
      lanes.forEach(lane => lane.replaceChildren());
      const sparkCount = 40;
      for (let i = 0; i < sparkCount; i++) {
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

    }, 4800);
    setTimeout(() => { if (!collected) message.textContent = ''; }, 8500);
  }
  document.dispatchEvent(new Event('star-orbit-ready'));
})();
