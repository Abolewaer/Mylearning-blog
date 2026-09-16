/* Authenticate in this page: no popup/opener dependency. */
window.installOwnerLogin = function (endpoint) {
  const h = window.h, storageKey = 'learning-blog-owner-device';
  const backend = window.CMS.getBackend('github');
  const originalInit = backend.init;
  const Login = window.createClass({
    getInitialState() { return { busy: false, error: '', remember: true }; },
    componentDidMount() {
      let token = '';
      try { token = localStorage.getItem(storageKey) || ''; } catch {}
      if (token) this.enter(token);
    },
    async api(path, body, token) {
      let r;
      try {
        r = await fetch(endpoint + path, { method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
          body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
      } catch { throw new Error('无法连接作者服务。请检查网络能否访问 Cloudflare，然后重试。'); }
      const result = await r.json();
      if (!r.ok) {
        if (r.status === 401) { try { localStorage.removeItem(storageKey); } catch {} }
        throw new Error(result.error || '作者验证失败，请重试。');
      }
      return result;
    },
    async enter(token) {
      this.setState({ busy: true, error: '' });
      try { await this.api('/owner/check', {}, token); this.props.onLogin({ token }); }
      catch (e) { this.setState({ error: e.message }); }
      finally { this.setState({ busy: false }); }
    },
    async submit(event) {
      event.preventDefault();
      if (this.state.busy || this.props.inProgress) return;
      const form = event.currentTarget, pin = form.elements.pin.value;
      this.setState({ busy: true, error: '' });
      try {
        const result = await this.api('/owner/login', { pin, remember: this.state.remember, name: '写作后台 · ' + (navigator.platform || '浏览器') });
        form.elements.pin.value = '';
        try { if (this.state.remember) localStorage.setItem(storageKey, result.token); else localStorage.removeItem(storageKey); } catch {}
        await this.enter(result.token);
      } catch (e) { this.setState({ error: e.message }); }
      finally { this.setState({ busy: false }); }
    },
    render() {
      const busy = this.state.busy || this.props.inProgress;
      const backendError = this.props.error;
      const error = this.state.error || (backendError ? (backendError.message || String(backendError)) : '');
      return h('main', { className: 'owner-login-page' },
        h('form', { onSubmit: this.submit },
          h('h1', null, '作者写作后台'),
          h('p', null, '验证作者身份后，即可编辑和发布学习笔记。'),
          h('label', null, '作者密码', h('input', { name: 'pin', type: 'password', autoComplete: 'current-password', required: true, maxLength: 128, disabled: busy })),
          h('label', { className: 'owner-remember' }, h('input', { type: 'checkbox', checked: this.state.remember, onChange: e => this.setState({ remember: e.target.checked }) }), '长期记住此浏览器'),
          error ? h('p', { role: 'alert' }, error) : null,
          h('button', { type: 'submit', disabled: busy }, busy ? '正在打开笔记…' : '进入写作后台'),
          h('a', { href: '../' }, '返回博客')));
    }
  });
  backend.init = (...args) => {
    const instance = originalInit(...args);
    instance.authComponent = () => Login;
    return instance;
  };
};
