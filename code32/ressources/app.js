(() => {
  const products = Array.isArray(window.CODE32_PRODUCTS) ? window.CODE32_PRODUCTS : [];
  const grid = document.querySelector('#product-grid');
  const count = document.querySelector('#results-count');
  const search = document.querySelector('#search');
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const modal = document.querySelector('#preview-modal');
  const modalTitle = document.querySelector('#modal-title');
  const modalKicker = document.querySelector('#modal-kicker');
  const modalDescription = document.querySelector('#modal-description');
  const modalFacts = document.querySelector('#modal-facts');
  const modalList = document.querySelector('#modal-list');
  const modalPages = document.querySelector('#modal-pages');
  const modalBuy = document.querySelector('#modal-buy');
  const modalStatus = document.querySelector('#modal-status');
  let currentFilter = 'all';
  let lastFocus = null;

  const normalize = value => (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const matches = product => {
    const query = normalize(search?.value.trim());
    const haystack = normalize([product.title, product.subtitle, product.category, product.level, product.description, ...(product.tags || [])].join(' '));
    const categoryOk = currentFilter === 'all' || product.category === currentFilter || (product.tags || []).includes(currentFilter);
    return categoryOk && (!query || haystack.includes(query));
  };

  const productCard = product => {
    const available = Boolean(product.checkoutUrl);
    const article = document.createElement('article');
    article.className = `product-card${product.featured ? ' featured' : ''}`;
    article.innerHTML = `
      <div class="card-top">
        <span class="badge">${product.badge || product.category}</span>
        <span class="price">${product.price}</span>
      </div>
      <p class="product-kicker">${product.category} · ${product.level}</p>
      <h3>${product.title}</h3>
      <p class="product-subtitle">${product.subtitle}</p>
      <p class="product-description">${product.description}</p>
      <div class="product-meta"><span>${product.type}</span><span>${available ? 'Disponible' : 'Pré-lancement'}</span></div>
      <div class="card-actions">
        <button class="button ghost dark preview-button" type="button">Voir l’aperçu</button>
        ${available
          ? `<a class="button primary buy-button" href="${product.checkoutUrl}" target="_blank" rel="noopener">Acheter</a>`
          : `<button class="button disabled" type="button" disabled>Bientôt en vente</button>`}
      </div>`;
    article.querySelector('.preview-button').addEventListener('click', event => openPreview(product, event.currentTarget));
    return article;
  };

  const render = () => {
    const visible = products.filter(matches);
    grid.replaceChildren(...visible.map(productCard));
    count.textContent = `${visible.length} ressource${visible.length === 1 ? '' : 's'}`;
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<strong>Aucun résultat.</strong><span>Essaie un autre mot-clé ou affiche tout le catalogue.</span>';
      grid.appendChild(empty);
    }
  };

  const configureBuyButton = product => {
    if (product.checkoutUrl) {
      modalBuy.hidden = false;
      modalBuy.href = product.checkoutUrl;
      modalBuy.textContent = `Acheter · ${product.price}`;
      modalStatus.textContent = 'Paiement sécurisé et livraison numérique.';
    } else {
      modalBuy.hidden = true;
      modalBuy.removeAttribute('href');
      modalStatus.textContent = 'Cette ressource est en pré-lancement.';
    }
  };

  const openPreview = (product, source) => {
    lastFocus = source || document.activeElement;
    modalKicker.textContent = `${product.category} / ${product.level}`;
    modalTitle.textContent = product.title;
    modalDescription.textContent = product.description;
    modalFacts.innerHTML = `<span>${product.price}</span><span>${product.type}</span><span>${product.subtitle}</span>`;
    modalList.replaceChildren(...product.bullets.map(item => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    }));
    modalPages.replaceChildren(...product.pages.map(page => {
      const article = document.createElement('article');
      article.className = `preview-page${page.locked ? ' locked' : ''}`;
      article.innerHTML = `<span>${page.label}</span><h3>${page.title}</h3><p>${page.body}</p>${page.locked ? '<div class="lock">🔒</div>' : ''}`;
      return article;
    }));
    configureBuyButton(product);
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modal.querySelector('.modal-close').focus();
  };

  const closePreview = () => {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lastFocus) lastFocus.focus();
  };

  document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closePreview));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) closePreview();
  });

  filterButtons.forEach(button => button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    render();
  }));

  search?.addEventListener('input', render);

  document.querySelectorAll('[data-open-free]').forEach(button => button.addEventListener('click', () => {
    const freeDemo = products[0];
    if (freeDemo) openPreview(freeDemo, button);
  }));

  render();
})();