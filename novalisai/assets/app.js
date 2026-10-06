(() => {
  'use strict';
  const root = document.documentElement;
  const data = JSON.parse(document.getElementById('site-data').textContent);
  root.classList.add('js');

  const menu = document.querySelector('.menu-button');
  const mobileNav = document.getElementById('mobile-nav');
  const setMenu = (open) => {
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? data.close : data.menu);
    mobileNav.classList.toggle('open', open);
  };
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menu.focus();
    }
  });
  const header = document.querySelector('.site-header');
  const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  const language = document.getElementById('language');
  language.addEventListener('change', () => {
    const selected = language.selectedOptions[0];
    if (selected && selected.dataset.url) window.location.assign(selected.dataset.url + window.location.hash);
  });
  document.querySelectorAll('.footer-languages a').forEach(link => {
    link.addEventListener('click', () => { link.hash = window.location.hash; });
  });

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('[role="tabpanel"]')];
  const activateTab = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(index));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        activateTab(next, true);
      }
    });
  });
  activateTab(0);

  const form = document.getElementById('contact-form');
  const preview = document.getElementById('email-preview');
  const emailBody = document.getElementById('email-body');
  const sendEmail = document.getElementById('send-email');
  const copyStatus = document.getElementById('copy-status');
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const labels = data.mail_labels;
    const lines = [data.mail_greeting, '',
      `${labels[0]} : ${String(values.get('name') || '').trim()}`,
      `${labels[1]} : ${String(values.get('email') || '').trim()}`];
    if (String(values.get('company') || '').trim()) lines.push(`${labels[2]} : ${String(values.get('company')).trim()}`);
    lines.push(`${labels[3]} : ${values.get('need')}`, '', `${labels[4]} :`, String(values.get('message') || '').trim());
    const body = lines.join('\n');
    emailBody.textContent = body;
    sendEmail.href = `mailto:achraf@novalisai.com?subject=${encodeURIComponent(data.mail_subject)}&body=${encodeURIComponent(body)}`;
    copyStatus.textContent = '';
    form.hidden = true;
    preview.hidden = false;
    preview.focus();
  });
  form.hidden = false;
  document.getElementById('edit-email').addEventListener('click', () => {
    preview.hidden = true;
    form.hidden = false;
    document.getElementById('contact-name').focus();
  });
  document.getElementById('copy-email').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(emailBody.textContent);
      copyStatus.textContent = data.copied;
    } catch {
      copyStatus.textContent = data.copy_error;
    }
  });

  const dialog = document.getElementById('policy-dialog');
  let dialogTrigger;
  document.querySelectorAll('[data-policy]').forEach(button => {
    button.addEventListener('click', () => {
      const policy = data.policies[button.dataset.policy];
      if (!policy) return;
      document.getElementById('policy-title').textContent = policy.title;
      const body = document.getElementById('policy-body');
      body.replaceChildren(...policy.text.map(text => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        return paragraph;
      }));
      dialogTrigger = button;
      dialog.showModal();
    });
  });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (dialogTrigger) dialogTrigger.focus(); });

  document.querySelectorAll('[data-year]').forEach(element => { element.textContent = new Date().getFullYear(); });
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('motion');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 20px 0px' });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  }
})();
