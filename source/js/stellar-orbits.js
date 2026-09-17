/* Only the accessible caption/layout anchor is DOM; all celestial bodies are Canvas. */
(() => {
  const home = document.querySelector('.observatory');
  if (!home) return;
  const game = document.createElement('section');
  game.className = 'stellar-orbits';
  game.setAttribute('aria-label', '引导星辰，休息片刻');
  game.innerHTML = `<div class="stellar-vessel" aria-hidden="true"></div>
    <span class="stellar-caption">一颗小小的恒星 <span class="stellar-count">0</span></span>
    <p class="stellar-hint">移动鼠标引导星辰，靠近恒星自然入轨</p>
    <p class="stellar-message" role="status" aria-live="polite"></p>`;
  home.append(game);
  let total = 0;
  const count = game.querySelector('.stellar-count');
  const message = game.querySelector('.stellar-message');
  document.addEventListener('star-population', event => {
    total = event.detail;
    count.textContent = `0 / ${Math.ceil(total / 2)}`;
    game.title = `共 ${total} 颗星辰，一半进入轨道后绽放`;
  });
  document.addEventListener('stellar-progress', event => {
    count.textContent = `${event.detail} / ${Math.ceil(total / 2)}`;
  });
  document.addEventListener('stellar-message', event => { message.textContent = event.detail; });
  document.dispatchEvent(new Event('star-population-request'));
  document.dispatchEvent(new Event('star-orbit-ready'));
})();
