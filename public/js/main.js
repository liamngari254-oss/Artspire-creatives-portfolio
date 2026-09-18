(function () {
  'use strict';

  document.getElementById('year').textContent = new Date().getFullYear();

  // ---------------------------------------------------------------
  // small helpers
  // ---------------------------------------------------------------

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Collects every image for a project: the cover image plus any extras,
  // de-duplicated and in order. Works with older entries that only had `image`.
  function projectImages(p) {
    const list = [];
    const push = (src) => {
      const v = typeof src === 'string' ? src.trim() : (src && src.url ? String(src.url).trim() : '');
      if (v && !list.includes(v)) list.push(v);
    };
    push(p.image);
    (Array.isArray(p.images) ? p.images : []).forEach(push);
    return list;
  }

  // ---------------------------------------------------------------
  // header + mobile nav
  // ---------------------------------------------------------------

  const header = document.getElementById('site-header');
  const nav = document.getElementById('site-nav');
  const toggle = document.getElementById('menu-toggle');

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  nav.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header.classList.toggle('scrolled', window.scrollY > 12);
      ticking = false;
    });
  }, { passive: true });

  // ---------------------------------------------------------------
  // contact link normalising
  // ---------------------------------------------------------------

  // Accepts "+254 712 345 678", "254712345678" or a full wa.me / api.whatsapp
  // URL and always returns a working https://wa.me/... link.
  function whatsappURL(raw, prefill) {
    if (!raw) return '';
    const value = String(raw).trim();
    let digits;

    if (/^https?:\/\//i.test(value)) {
      const match = value.match(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=|web\.whatsapp\.com\/send\?phone=)\/?(\+?\d[\d\s-]*)/i);
      if (!match) return value; // some other link the owner pasted - leave it alone
      digits = match[1].replace(/\D/g, '');
    } else {
      digits = value.replace(/\D/g, '');
    }

    if (!digits) return '';
    let url = `https://wa.me/${digits}`;
    if (prefill) url += `?text=${encodeURIComponent(prefill)}`;
    return url;
  }

  // Accepts "@artspire", "artspire" or a full profile URL.
  function instagramURL(raw) {
    if (!raw) return '';
    const value = String(raw).trim();
    if (/^https?:\/\//i.test(value)) return value;
    return `https://instagram.com/${value.replace(/^@/, '')}`;
  }

  function instagramLabel(raw) {
    if (!raw) return '';
    const value = String(raw).trim();
    const handle = value
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/\/+$/, '')
      .replace(/^@/, '');
    return handle ? `@${handle}` : value;
  }

  const ICONS = {
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.95 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
    location: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  };

  const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

  // ---------------------------------------------------------------
  // lightbox / project slider
  // ---------------------------------------------------------------

  const lightbox = {
    root: document.getElementById('lightbox'),
    stage: document.getElementById('lb-stage'),
    image: document.getElementById('lb-image'),
    title: document.getElementById('lb-title'),
    cat: document.getElementById('lb-cat'),
    caption: document.getElementById('lb-caption'),
    counter: document.getElementById('lb-counter'),
    thumbs: document.getElementById('lb-thumbs'),
    prev: document.getElementById('lb-prev'),
    next: document.getElementById('lb-next'),
    close: document.getElementById('lb-close'),
    link: document.getElementById('lb-project-link'),
    images: [],
    index: 0,
    lastFocused: null,
  };

  function preload(src) {
    if (!src) return;
    const img = new Image();
    img.src = src;
  }

  function showImage(i) {
    const total = lightbox.images.length;
    if (!total) return;
    lightbox.index = (i + total) % total;
    const src = lightbox.images[lightbox.index];

    lightbox.image.src = src;
    lightbox.image.alt = `${lightbox.title.textContent} - image ${lightbox.index + 1} of ${total}`;
    lightbox.counter.textContent = total > 1 ? `${lightbox.index + 1} / ${total}` : '';

    lightbox.thumbs.querySelectorAll('button').forEach((b, bi) => {
      const isActive = bi === lightbox.index;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-current', isActive ? 'true' : 'false');
      if (isActive) b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    });

    // keep the neighbours warm so sliding feels instant
    preload(lightbox.images[(lightbox.index + 1) % total]);
    preload(lightbox.images[(lightbox.index - 1 + total) % total]);
  }

  function openLightbox(project, startAt) {
    const images = projectImages(project);
    if (!images.length) return;

    lightbox.lastFocused = document.activeElement;
    lightbox.images = images;

    lightbox.title.textContent = project.title || 'Project';
    lightbox.cat.textContent = project.category || '';
    lightbox.caption.textContent = project.description || '';

    const multiple = images.length > 1;
    lightbox.prev.hidden = !multiple;
    lightbox.next.hidden = !multiple;
    lightbox.thumbs.hidden = !multiple;

    lightbox.thumbs.innerHTML = '';
    if (multiple) {
      images.forEach((src, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', `Go to image ${i + 1}`);
        b.innerHTML = `<img src="${escapeHTML(src)}" alt="" loading="lazy">`;
        b.addEventListener('click', () => showImage(i));
        lightbox.thumbs.appendChild(b);
      });
    }

    if (project.link) {
      lightbox.link.href = project.link;
      lightbox.link.hidden = false;
    } else {
      lightbox.link.hidden = true;
    }

    lightbox.root.hidden = false;
    // next frame so the CSS transition runs
    requestAnimationFrame(() => lightbox.root.classList.add('open'));
    document.body.classList.add('no-scroll');

    showImage(startAt || 0);
    lightbox.close.focus();
  }

  function closeLightbox() {
    lightbox.root.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => {
      lightbox.root.hidden = true;
      lightbox.image.removeAttribute('src');
    }, 250);
    if (lightbox.lastFocused && lightbox.lastFocused.focus) lightbox.lastFocused.focus();
  }

  lightbox.close.addEventListener('click', closeLightbox);
  lightbox.prev.addEventListener('click', () => showImage(lightbox.index - 1));
  lightbox.next.addEventListener('click', () => showImage(lightbox.index + 1));

  // click the dimmed backdrop (but not the image itself) to close
  lightbox.stage.addEventListener('click', (e) => {
    if (e.target === lightbox.stage) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (lightbox.root.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showImage(lightbox.index + 1);
    if (e.key === 'ArrowLeft') showImage(lightbox.index - 1);
  });

  // keep tab focus inside the dialog while it's open
  lightbox.root.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      lightbox.root.querySelectorAll('button:not([hidden]), a[href]:not([hidden])')
    ).filter((n) => n.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // swipe on touch devices
  let touchStartX = 0;
  let touchStartY = 0;
  lightbox.stage.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  lightbox.stage.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      showImage(lightbox.index + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });

  // ---------------------------------------------------------------
  // portfolio rendering + category filter
  // ---------------------------------------------------------------

  const gallery = document.getElementById('gallery');
  const filterBar = document.getElementById('filter-bar');

  function buildProjectCard(project) {
    const images = projectImages(project);
    const cover = images[0] || '/assets/logo.png';
    const many = images.length > 1;

    const card = el('button', 'gallery-item');
    card.type = 'button';
    card.setAttribute(
      'aria-label',
      `Open ${project.title || 'project'}${many ? ` gallery, ${images.length} images` : ''}`
    );

    const countBadge = many
      ? `<span class="photo-count"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 21h12a2 2 0 0 0 2-2V7"/></svg>${images.length}</span>`
      : '';

    card.innerHTML = `
      <div class="thumb">
        <img src="${escapeHTML(cover)}" alt="${escapeHTML(project.title || '')}" loading="lazy">
        ${countBadge}
        <span class="thumb-overlay"><span>${many ? 'Open gallery' : 'View image'}</span></span>
      </div>
      <div class="info">
        <span class="cat">${escapeHTML(project.category || '')}</span>
        <h3>${escapeHTML(project.title || '')}</h3>
        <p>${escapeHTML(project.description || '')}</p>
        <span class="open-hint">${many ? `See all ${images.length} images` : 'View project'}</span>
      </div>
    `;

    card.addEventListener('click', () => openLightbox(project));
    return card;
  }

  function renderProjects(projects, category) {
    gallery.innerHTML = '';

    if (!projects.length) {
      gallery.appendChild(
        el('div', 'empty-note', 'No projects added yet. Sign in at /admin to add your first one.')
      );
      return;
    }

    const shown = category && category !== 'All'
      ? projects.filter((p) => (p.category || '').trim() === category)
      : projects;

    if (!shown.length) {
      gallery.appendChild(el('div', 'empty-note', 'Nothing in this category yet.'));
      return;
    }

    shown.forEach((p) => gallery.appendChild(buildProjectCard(p)));
  }

  function renderFilters(projects) {
    filterBar.innerHTML = '';
    const categories = Array.from(
      new Set(projects.map((p) => (p.category || '').trim()).filter(Boolean))
    );

    // one category (or none) isn't worth a filter bar
    if (categories.length < 2) return;

    ['All'].concat(categories).forEach((cat, i) => {
      const chip = el('button', 'filter-chip' + (i === 0 ? ' active' : ''), escapeHTML(cat));
      chip.type = 'button';
      chip.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      chip.addEventListener('click', () => {
        filterBar.querySelectorAll('.filter-chip').forEach((c) => {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');
        renderProjects(projects, cat);
      });
      filterBar.appendChild(chip);
    });
  }

  // ---------------------------------------------------------------
  // contact rendering
  // ---------------------------------------------------------------

  function renderContact(contact) {
    const contactList = document.getElementById('contact-list');
    contactList.innerHTML = '';

    const defaultPrefill =
      contact.whatsappMessage || 'Hi Artspire, I saw your website and I have a project in mind.';
    const waLink = whatsappURL(contact.whatsapp, defaultPrefill);
    const igLink = instagramURL(contact.instagram);

    const rows = [
      contact.email && {
        kind: 'email', label: 'Email', value: contact.email,
        href: `mailto:${contact.email}`, external: false,
      },
      contact.phone && {
        kind: 'phone', label: 'Call', value: contact.phone,
        href: `tel:${String(contact.phone).replace(/[^\d+]/g, '')}`, external: false,
      },
      waLink && {
        kind: 'whatsapp', label: 'WhatsApp', value: 'Start a chat',
        href: waLink, external: true,
      },
      igLink && {
        kind: 'instagram', label: 'Instagram', value: instagramLabel(contact.instagram),
        href: igLink, external: true,
      },
      contact.location && {
        kind: 'location', label: 'Based in', value: contact.location, href: null,
      },
    ].filter(Boolean);

    rows.forEach((row) => {
      const li = document.createElement('li');
      const inner = `
        <span class="contact-icon">${ICONS[row.kind]}</span>
        <span class="contact-text">
          <span class="label">${escapeHTML(row.label)}</span>
          <span class="value">${escapeHTML(row.value)}</span>
        </span>
        ${row.href ? `<span class="contact-arrow">${ARROW}</span>` : ''}
      `;

      if (row.href) {
        const a = document.createElement('a');
        a.className = 'contact-link';
        a.href = row.href;
        a.dataset.kind = row.kind;
        if (row.external) { a.target = '_blank'; a.rel = 'noopener'; }
        a.innerHTML = inner;
        li.appendChild(a);
      } else {
        li.appendChild(el('div', 'contact-link', inner));
      }
      contactList.appendChild(li);
    });

    // floating WhatsApp bubble
    const waFloat = document.getElementById('wa-float');
    if (waLink) {
      waFloat.href = waLink;
      waFloat.hidden = false;
    }

    // ----- contact form: email and WhatsApp routes -----
    const form = document.getElementById('contact-form');
    const note = document.getElementById('contact-form-note');
    const emailBtn = document.getElementById('send-email-btn');
    const waBtn = document.getElementById('send-whatsapp-btn');

    emailBtn.hidden = !contact.email;
    waBtn.hidden = !waLink;

    if (contact.email && waLink) {
      note.textContent = 'Email opens your mail app. WhatsApp opens a chat with your message ready to send.';
    } else if (contact.email) {
      note.textContent = `Opens your email app addressed to ${contact.email}.`;
    } else if (waLink) {
      note.textContent = 'Opens WhatsApp with your message ready to send.';
    } else {
      note.textContent = 'Add an email address or WhatsApp number in the CMS to enable this form.';
    }

    function readForm() {
      const fd = new FormData(form);
      return {
        name: String(fd.get('name') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        message: String(fd.get('message') || '').trim(),
      };
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contact.email) return;
      const d = readForm();
      const subject = encodeURIComponent(`New project enquiry from ${d.name}`);
      const body = encodeURIComponent(`${d.message}\n\n- ${d.name} (${d.email})`);
      window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
    });

    waBtn.addEventListener('click', () => {
      if (!waLink) return;
      if (!form.reportValidity()) return;
      const d = readForm();
      const text = `Hi Artspire, I'd like to start a project.\n\n${d.message}\n\n- ${d.name} (${d.email})`;
      window.open(whatsappURL(contact.whatsapp, text), '_blank', 'noopener');
    });
  }

  // ---------------------------------------------------------------
  // main render
  // ---------------------------------------------------------------

  function render(content) {
    // Hero text
    document.getElementById('hero-headline').textContent = content.hero?.headline || '';
    document.getElementById('hero-subhead').textContent = content.hero?.subhead || '';

    // Hero image - swaps out the brand colour bars when a photo is set
    const heroInner = document.getElementById('hero-media-inner');
    const heroImage = String(content.hero?.image || '').trim();
    if (heroImage) {
      heroInner.innerHTML = '';
      const img = document.createElement('img');
      img.src = heroImage;
      img.alt = content.hero?.imageAlt || 'Artspire design work';
      img.setAttribute('fetchpriority', 'high');
      heroInner.appendChild(img);
    }

    // What we do
    document.getElementById('wwd-intro').textContent = content.whatWeDo?.intro || '';
    const offerGrid = document.getElementById('offer-grid');
    offerGrid.innerHTML = '';
    (content.whatWeDo?.items || []).forEach((item) => {
      offerGrid.appendChild(el('div', 'offer-item', escapeHTML(item)));
    });

    // Portfolio
    const projects = content.projects || [];
    renderFilters(projects);
    renderProjects(projects, 'All');

    // About
    document.getElementById('about-eyebrow').textContent =
      content.about?.eyebrow || 'The story behind Artspire';
    document.getElementById('about-philosophy').textContent = content.about?.philosophy || '';
    document.getElementById('about-story').textContent = content.about?.story || '';
    document.getElementById('about-founder').textContent = content.about?.founder || '';

    // Services
    const servicesList = document.getElementById('services-list');
    servicesList.innerHTML = '';
    (content.services || []).forEach((s) => {
      const row = el('div', 'service-row');
      row.innerHTML = `<h3>${escapeHTML(s.title)}</h3><p>${escapeHTML(s.description)}</p>`;
      servicesList.appendChild(row);
    });

    // Case studies
    const caseList = document.getElementById('case-list');
    caseList.innerHTML = '';
    (content.caseStudies || []).forEach((c) => {
      const item = el('div', 'case-item');
      item.innerHTML = `
        <div class="thumb"><img src="${escapeHTML(c.image)}" alt="${escapeHTML(c.title)}" loading="lazy"></div>
        <div class="case-body">
          <h3>${escapeHTML(c.title)}</h3>
          <div class="case-field"><span class="label">Challenge</span><p>${escapeHTML(c.challenge)}</p></div>
          <div class="case-field"><span class="label">Approach</span><p>${escapeHTML(c.approach)}</p></div>
          <div class="case-field"><span class="label">Result</span><p>${escapeHTML(c.result)}</p></div>
        </div>
      `;
      caseList.appendChild(item);
    });

    // Why us
    const whyGrid = document.getElementById('why-grid');
    whyGrid.innerHTML = '';
    (content.whyUs || []).forEach((w) => {
      const item = el('div', 'why-item');
      item.innerHTML = `<h3>${escapeHTML(w.title)}</h3><p>${escapeHTML(w.description)}</p>`;
      whyGrid.appendChild(item);
    });

    // Testimonials
    const testiGrid = document.getElementById('testi-grid');
    testiGrid.innerHTML = '';
    (content.testimonials || []).forEach((t) => {
      const card = el('div', 'testi-card');
      card.innerHTML = `
        <p class="testi-quote">${escapeHTML(t.quote)}</p>
        <p class="testi-name">${escapeHTML(t.name)}</p>
        <p class="testi-role">${escapeHTML(t.role || '')}</p>
      `;
      testiGrid.appendChild(card);
    });

    // CTA
    document.getElementById('cta-headline').textContent = content.cta?.headline || '';
    const ctaBtn = document.getElementById('cta-button');
    ctaBtn.textContent = content.cta?.buttonText || 'Start a project';
    ctaBtn.href = content.cta?.buttonLink || '#contact';

    // Contact
    renderContact(content.contact || {});
  }

  fetch('/api/content')
    .then((r) => r.json())
    .then(render)
    .catch(() => {
      document.getElementById('hero-headline').textContent = 'Artspire';
      document.getElementById('hero-subhead').textContent =
        'Content could not be loaded right now. Please refresh the page.';
    });
})();
