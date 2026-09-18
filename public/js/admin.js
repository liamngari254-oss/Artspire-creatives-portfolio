(function () {
  'use strict';

  const loginScreen = document.getElementById('login-screen');
  const adminApp = document.getElementById('admin-app');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const tabContent = document.getElementById('tab-content');
  const toast = document.getElementById('admin-toast');
  const navButtons = document.querySelectorAll('.admin-nav button');

  let CONTENT = null;
  let activeTab = 'hero';

  function showToast(message, isError) {
    toast.textContent = message;
    toast.classList.toggle('error', Boolean(isError));
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // ---------------- auth ----------------

  async function checkAuth() {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (data.isAdmin) {
      loginScreen.classList.add('hidden');
      adminApp.classList.remove('hidden');
      await loadContent();
      renderTab(activeTab);
    } else {
      loginScreen.classList.remove('hidden');
      adminApp.classList.add('hidden');
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const fd = new FormData(loginForm);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') }),
    });
    if (res.ok) {
      loginForm.reset();
      checkAuth();
    } else {
      const data = await res.json().catch(() => ({}));
      loginError.textContent = data.error || 'Could not sign in.';
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    checkAuth();
  });

  // ---------------- content loading ----------------

  async function loadContent() {
    const res = await fetch('/api/content');
    CONTENT = await res.json();
  }

  async function saveSection(name, payload) {
    const res = await fetch(`/api/admin/section/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Save failed.');
    return res.json();
  }

  async function addListItem(listName, item) {
    const res = await fetch(`/api/admin/list/${listName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Could not add item.');
    return res.json();
  }

  async function updateListItem(listName, id, item) {
    const res = await fetch(`/api/admin/list/${listName}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Could not save item.');
    return res.json();
  }

  async function deleteListItem(listName, id) {
    const res = await fetch(`/api/admin/list/${listName}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || 'Could not delete item.');
    return res.json();
  }

  async function uploadImage(file) {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error((await res.json()).error || 'Upload failed.');
    return (await res.json()).url;
  }

  async function uploadImages(fileList) {
    const fd = new FormData();
    Array.from(fileList).forEach((f) => fd.append('images', f));
    const res = await fetch('/api/admin/upload-many', { method: 'POST', body: fd });
    if (!res.ok) throw new Error((await res.json()).error || 'Upload failed.');
    return (await res.json()).urls;
  }

  // ---------------- tab navigation ----------------

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      navButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      renderTab(activeTab);
    });
  });

  function renderTab(tab) {
    const renderers = {
      hero: renderHeroTab,
      whatWeDo: renderWhatWeDoTab,
      projects: () => renderListTab('projects', projectFields, 'New project'),
      about: renderAboutTab,
      services: () => renderListTab('services', serviceFields, 'New service'),
      caseStudies: () => renderListTab('caseStudies', caseStudyFields, 'New case study'),
      whyUs: () => renderListTab('whyUs', whyUsFields, 'New reason'),
      testimonials: () => renderListTab('testimonials', testimonialFields, 'New testimonial'),
      cta: renderCtaTab,
      contact: renderContactTab,
    };
    (renderers[tab] || renderHeroTab)();
  }

  // ---------------- simple-section tabs ----------------

  function simpleForm({ title, sub, sectionName, fields, values }) {
    tabContent.innerHTML = `
      <h2 class="panel-title">${esc(title)}</h2>
      <p class="panel-sub">${esc(sub)}</p>
      <form id="section-form"></form>
    `;
    const form = document.getElementById('section-form');

    fields.forEach((f) => {
      const wrap = document.createElement('div');
      wrap.className = 'field';

      if (f.type === 'image') {
        wrap.innerHTML = `
          <label>${esc(f.label)}</label>
          <div class="image-slot" data-slot="${esc(f.key)}">
            ${values[f.key]
              ? `<img class="image-preview image-preview-lg" src="${esc(values[f.key])}" alt="">`
              : `<div class="image-empty">No photo yet — the brand colour bars are showing instead.</div>`}
          </div>
          <div class="upload-row">
            <input type="file" accept="image/*" data-imgfield="${esc(f.key)}">
            <button type="button" class="link-btn" data-clear="${esc(f.key)}"${values[f.key] ? '' : ' hidden'}>Remove photo</button>
          </div>
          ${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}
          <input type="hidden" name="${esc(f.key)}" value="${esc(values[f.key] || '')}">
        `;
      } else if (f.type === 'textarea') {
        wrap.innerHTML = `
          <label for="f-${esc(f.key)}">${esc(f.label)}</label>
          <textarea id="f-${esc(f.key)}" name="${esc(f.key)}">${esc(values[f.key] || '')}</textarea>
          ${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}
        `;
      } else {
        wrap.innerHTML = `
          <label for="f-${esc(f.key)}">${esc(f.label)}</label>
          <input id="f-${esc(f.key)}" name="${esc(f.key)}" type="text" value="${esc(values[f.key] || '')}">
          ${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}
        `;
      }

      form.appendChild(wrap);
    });

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'Save changes';
    form.appendChild(saveBtn);

    // image pickers
    form.querySelectorAll('input[type="file"][data-imgfield]').forEach((input) => {
      input.addEventListener('change', async () => {
        if (!input.files[0]) return;
        const key = input.dataset.imgfield;
        try {
          showToast('Uploading photo…');
          const url = await uploadImage(input.files[0]);
          form.querySelector(`input[name="${key}"]`).value = url;
          const slot = form.querySelector(`[data-slot="${key}"]`);
          slot.innerHTML = `<img class="image-preview image-preview-lg" src="${esc(url)}" alt="">`;
          const clearBtn = form.querySelector(`[data-clear="${key}"]`);
          if (clearBtn) clearBtn.hidden = false;
          input.value = '';
          showToast('Photo uploaded. Click Save changes to publish it.');
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    form.querySelectorAll('[data-clear]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.clear;
        form.querySelector(`input[name="${key}"]`).value = '';
        form.querySelector(`[data-slot="${key}"]`).innerHTML =
          `<div class="image-empty">No photo yet — the brand colour bars are showing instead.</div>`;
        btn.hidden = true;
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = { ...values };
      fields.forEach((f) => (payload[f.key] = fd.get(f.key)));
      try {
        await saveSection(sectionName, payload);
        CONTENT[sectionName] = payload;
        showToast('Saved.');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  function renderHeroTab() {
    simpleForm({
      title: 'Hero',
      sub: 'The first thing people see when they land on the site.',
      sectionName: 'hero',
      values: CONTENT.hero || {},
      fields: [
        { key: 'headline', label: 'Headline', type: 'textarea' },
        { key: 'subhead', label: 'Subheading', type: 'textarea' },
        {
          key: 'image',
          label: 'Hero photo',
          type: 'image',
          hint: 'Replaces the colour bars beside the headline. A landscape or square photo around 1200×1200px works best.',
        },
        {
          key: 'imageAlt',
          label: 'Photo description',
          hint: 'A short description of the photo, read aloud by screen readers.',
        },
      ],
    });
  }

  function renderAboutTab() {
    simpleForm({
      title: 'About / story',
      sub: 'The story behind Artspire, and what design should accomplish.',
      sectionName: 'about',
      values: CONTENT.about || {},
      fields: [
        { key: 'eyebrow', label: 'Section label', hint: 'Small label above the story, e.g. "The story behind Artspire"' },
        { key: 'philosophy', label: 'Design philosophy (pull quote)', type: 'textarea' },
        { key: 'story', label: 'Your story', type: 'textarea' },
        { key: 'founder', label: 'Signature line', hint: 'e.g. "William — Founder & Lead Designer, Artspire"' },
      ],
    });
  }

  function renderCtaTab() {
    simpleForm({
      title: 'Call to action',
      sub: 'The bold banner near the bottom of the page.',
      sectionName: 'cta',
      values: CONTENT.cta || {},
      fields: [
        { key: 'headline', label: 'Headline', type: 'textarea' },
        { key: 'buttonText', label: 'Button text' },
        { key: 'buttonLink', label: 'Button link', hint: 'e.g. #contact or a full URL' },
      ],
    });
  }

  function renderContactTab() {
    simpleForm({
      title: 'Contact details',
      sub: 'Shown in the footer as tappable links. Leave a field blank to hide it from the site.',
      sectionName: 'contact',
      values: CONTENT.contact || {},
      fields: [
        { key: 'email', label: 'Email address', hint: 'Becomes a link that opens the visitor\'s email app.' },
        { key: 'phone', label: 'Phone number', hint: 'Becomes a tap-to-call link on phones. Include the country code, e.g. +254 712 345 678' },
        {
          key: 'whatsapp',
          label: 'WhatsApp number',
          hint: 'Just the number with country code, e.g. +254712345678 — the wa.me link is built for you. A full wa.me link also works.',
        },
        { key: 'whatsappMessage', label: 'WhatsApp opening message', hint: 'Pre-filled in the chat box when someone taps WhatsApp. Leave blank for the default.' },
        { key: 'instagram', label: 'Instagram', hint: 'Handle or full link, e.g. @artspire' },
        { key: 'location', label: 'Location / availability text' },
      ],
    });
  }

  function renderWhatWeDoTab() {
    const data = CONTENT.whatWeDo || { intro: '', items: [] };
    tabContent.innerHTML = `
      <h2 class="panel-title">What we do</h2>
      <p class="panel-sub">The short intro line, plus the list of services shown as tags.</p>
      <div class="field">
        <label for="wwd-intro">Intro line</label>
        <textarea id="wwd-intro">${esc(data.intro || '')}</textarea>
      </div>
      <div class="field">
        <label>Service tags</label>
        <div class="tag-editor" id="tag-editor"></div>
        <div class="tag-add">
          <input type="text" id="tag-input" placeholder="e.g. Social media graphics">
          <button type="button" id="tag-add-btn">Add</button>
        </div>
      </div>
      <button type="button" class="save-btn" id="wwd-save">Save changes</button>
    `;
    let items = [...(data.items || [])];

    function renderChips() {
      const box = document.getElementById('tag-editor');
      box.innerHTML = '';
      items.forEach((item, i) => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = `${esc(item)} <button type="button" aria-label="Remove">×</button>`;
        chip.querySelector('button').addEventListener('click', () => {
          items.splice(i, 1);
          renderChips();
        });
        box.appendChild(chip);
      });
    }
    renderChips();

    document.getElementById('tag-add-btn').addEventListener('click', () => {
      const input = document.getElementById('tag-input');
      if (input.value.trim()) {
        items.push(input.value.trim());
        input.value = '';
        renderChips();
      }
    });

    document.getElementById('wwd-save').addEventListener('click', async () => {
      const payload = { intro: document.getElementById('wwd-intro').value, items };
      try {
        await saveSection('whatWeDo', payload);
        CONTENT.whatWeDo = payload;
        showToast('Saved.');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // ---------------- repeatable list tabs ----------------

  const projectFields = [
    { key: 'title', label: 'Project title' },
    { key: 'category', label: 'Category', hint: 'e.g. Social Media, Flyer, Brochure. Categories become filter buttons on the site.' },
    {
      key: 'images',
      label: 'Project images',
      type: 'gallery',
      hint: 'Add as many as you like. The first image is the cover on the card; visitors slide through the rest.',
    },
    { key: 'description', label: 'Short description', type: 'textarea' },
    { key: 'link', label: 'Link to full project (optional)' },
  ];
  const serviceFields = [
    { key: 'title', label: 'Service title' },
    { key: 'description', label: 'Description', type: 'textarea' },
  ];
  const caseStudyFields = [
    { key: 'title', label: 'Title' },
    { key: 'image', label: 'Image', type: 'image' },
    { key: 'challenge', label: 'Challenge', type: 'textarea' },
    { key: 'approach', label: 'Approach', type: 'textarea' },
    { key: 'result', label: 'Result', type: 'textarea' },
  ];
  const whyUsFields = [
    { key: 'title', label: 'Reason' },
    { key: 'description', label: 'Description', type: 'textarea' },
  ];
  const testimonialFields = [
    { key: 'name', label: 'Client name' },
    { key: 'role', label: 'Role / organisation' },
    { key: 'quote', label: 'Testimonial', type: 'textarea' },
  ];

  const titleKeyFor = {
    projects: 'title', services: 'title', caseStudies: 'title', whyUs: 'title', testimonials: 'name',
  };

  // Merges the legacy single `image` with the newer `images` array so older
  // projects keep working and never lose their original picture.
  function mergedImages(item) {
    const list = [];
    const push = (v) => {
      const s = String(v || '').trim();
      if (s && !list.includes(s)) list.push(s);
    };
    push(item.image);
    (Array.isArray(item.images) ? item.images : []).forEach(push);
    return list;
  }

  function renderListTab(listName, fields, addLabel) {
    const items = CONTENT[listName] || [];
    tabContent.innerHTML = `
      <h2 class="panel-title">${esc(addLabel.replace('New ', '').replace(/^./, (c) => c.toUpperCase()))}s</h2>
      <p class="panel-sub">Add, edit or remove entries. Changes go live on the site immediately.</p>
      <div id="list-items"></div>
      <button type="button" class="add-item-btn" id="add-item-btn">+ ${esc(addLabel)}</button>
    `;
    const container = document.getElementById('list-items');

    items.forEach((item) =>
      container.appendChild(buildItemCard(listName, fields, item, titleKeyFor[listName]))
    );

    document.getElementById('add-item-btn').addEventListener('click', () => {
      const blank = {};
      fields.forEach((f) => (blank[f.key] = f.type === 'gallery' ? [] : ''));
      const card = buildItemCard(listName, fields, blank, titleKeyFor[listName], true);
      container.appendChild(card);
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function buildItemCard(listName, fields, item, titleKey, startEditing) {
    const card = document.createElement('div');
    card.className = 'item-card';
    const isNew = !item.id;

    function displayView() {
      const shots = listName === 'projects' ? mergedImages(item) : [];
      const badge = shots.length
        ? `<span class="count-badge">${shots.length} image${shots.length === 1 ? '' : 's'}</span>`
        : '';
      card.innerHTML = `
        <div class="item-card-head">
          <div class="item-card-title">
            ${shots[0] ? `<img class="item-thumb" src="${esc(shots[0])}" alt="">` : ''}
            <div>
              <h4>${esc(item[titleKey] || 'Untitled')}</h4>
              ${badge}
            </div>
          </div>
          <div class="item-card-actions">
            <button type="button" class="edit-btn">Edit</button>
            <button type="button" class="delete-btn">Delete</button>
          </div>
        </div>
      `;
      card.querySelector('.edit-btn').addEventListener('click', () => editView());
      card.querySelector('.delete-btn').addEventListener('click', async () => {
        if (!confirm('Delete this entry? This cannot be undone.')) return;
        try {
          if (item.id) await deleteListItem(listName, item.id);
          CONTENT[listName] = (CONTENT[listName] || []).filter((x) => x.id !== item.id);
          card.remove();
          showToast('Deleted.');
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    function editView() {
      // live state for gallery fields, kept outside the DOM
      const galleries = {};
      fields.forEach((f) => {
        if (f.type === 'gallery') galleries[f.key] = mergedImages(item);
      });

      const formFieldsHtml = fields
        .map((f) => {
          if (f.type === 'gallery') {
            return `
              <div class="field">
                <label>${esc(f.label)}</label>
                <div class="gallery-editor" data-gallery="${esc(f.key)}"></div>
                <div class="upload-row">
                  <label class="file-btn">
                    Add images
                    <input type="file" accept="image/*" multiple data-galleryinput="${esc(f.key)}" hidden>
                  </label>
                  <span class="hint">${esc(f.hint || '')}</span>
                </div>
              </div>
            `;
          }

          if (f.type === 'image') {
            return `
              <div class="field">
                <label>${esc(f.label)}</label>
                ${item[f.key] ? `<img class="image-preview" src="${esc(item[f.key])}" alt="">` : ''}
                <div class="upload-row">
                  <input type="file" accept="image/*" data-imgfield="${esc(f.key)}">
                  <span class="hint">Uploads a new image, or leave as-is to keep the current one.</span>
                </div>
                <input type="hidden" name="${esc(f.key)}" value="${esc(item[f.key] || '')}">
              </div>
            `;
          }

          const isTextarea = f.type === 'textarea';
          return `
            <div class="field">
              <label>${esc(f.label)}</label>
              ${isTextarea
                ? `<textarea name="${esc(f.key)}">${esc(item[f.key] || '')}</textarea>`
                : `<input type="text" name="${esc(f.key)}" value="${esc(item[f.key] || '')}">`}
              ${f.hint && f.type !== 'gallery' ? `<span class="hint">${esc(f.hint)}</span>` : ''}
            </div>
          `;
        })
        .join('');

      card.innerHTML = `<form class="item-form">${formFieldsHtml}
        <div class="item-card-actions" style="margin-top:14px;">
          <button type="submit" class="edit-btn save-inline">Save</button>
          <button type="button" class="delete-btn cancel-btn" style="color:var(--navy-deep);">Cancel</button>
        </div>
      </form>`;

      const form = card.querySelector('.item-form');

      // ---- gallery editor ----
      function drawGallery(key) {
        const box = form.querySelector(`[data-gallery="${key}"]`);
        const list = galleries[key];
        box.innerHTML = '';

        if (!list.length) {
          box.innerHTML = '<p class="gallery-empty">No images yet. Use “Add images” below — you can select several at once.</p>';
          return;
        }

        list.forEach((src, i) => {
          const tile = document.createElement('div');
          tile.className = 'gallery-tile' + (i === 0 ? ' is-cover' : '');
          tile.innerHTML = `
            <img src="${esc(src)}" alt="">
            ${i === 0 ? '<span class="cover-flag">Cover</span>' : ''}
            <div class="tile-tools">
              <button type="button" data-act="left" ${i === 0 ? 'disabled' : ''} aria-label="Move earlier">←</button>
              <button type="button" data-act="right" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Move later">→</button>
              <button type="button" data-act="remove" aria-label="Remove image">×</button>
            </div>
          `;
          tile.querySelectorAll('button').forEach((b) => {
            b.addEventListener('click', () => {
              const act = b.dataset.act;
              if (act === 'remove') list.splice(i, 1);
              if (act === 'left' && i > 0) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; }
              if (act === 'right' && i < list.length - 1) { [list[i + 1], list[i]] = [list[i], list[i + 1]]; }
              drawGallery(key);
            });
          });
          box.appendChild(tile);
        });
      }

      Object.keys(galleries).forEach(drawGallery);

      form.querySelectorAll('input[data-galleryinput]').forEach((input) => {
        input.addEventListener('change', async () => {
          if (!input.files || !input.files.length) return;
          const key = input.dataset.galleryinput;
          try {
            showToast(`Uploading ${input.files.length} image${input.files.length === 1 ? '' : 's'}…`);
            const urls = await uploadImages(input.files);
            galleries[key].push(...urls);
            drawGallery(key);
            input.value = '';
            showToast('Images added. Click Save to publish.');
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });

      // ---- single image fields ----
      form.querySelectorAll('input[type="file"][data-imgfield]').forEach((input) => {
        input.addEventListener('change', async () => {
          if (!input.files[0]) return;
          try {
            showToast('Uploading image…');
            const url = await uploadImage(input.files[0]);
            form.querySelector(`input[name="${input.dataset.imgfield}"]`).value = url;
            showToast('Image uploaded.');
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });

      form.querySelector('.cancel-btn').addEventListener('click', () => {
        if (isNew) card.remove();
        else displayView();
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = {};
        fields.forEach((f) => {
          if (f.type === 'gallery') {
            payload[f.key] = galleries[f.key];
            // keep the legacy cover field in step with the first image
            payload.image = galleries[f.key][0] || '';
          } else {
            payload[f.key] = fd.get(f.key);
          }
        });

        try {
          if (item.id) {
            const { item: saved } = await updateListItem(listName, item.id, payload);
            item = saved;
            const idx = (CONTENT[listName] || []).findIndex((x) => x.id === saved.id);
            if (idx > -1) CONTENT[listName][idx] = saved;
          } else {
            const { item: saved } = await addListItem(listName, payload);
            item = saved;
            CONTENT[listName] = CONTENT[listName] || [];
            CONTENT[listName].push(saved);
          }
          showToast('Saved.');
          displayView();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    if (startEditing) editView();
    else displayView();

    return card;
  }

  checkAuth();
})();
