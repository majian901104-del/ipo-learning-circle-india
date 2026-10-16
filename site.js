'use strict';
// Shared progressive enhancement. All generated search text uses textContent.
const filterButtons = [...document.querySelectorAll('[data-filter]')];
if (filterButtons.length) {
  const isResearch = Boolean(document.querySelector('.research-visual-grid'));
  const items = [...document.querySelectorAll(isResearch ? '.research-visual-card' : '.issuer-line:not(.head)')];
  if (isResearch) {
    const input = document.getElementById('research-query');
    const status = document.getElementById('filter-status');
    let category = 'ALL RESEARCH';
    // Use explicit report metadata so rearranging cards cannot silently change a report's type.
    function updateResearch() {
      const tokens = (input?.value || '').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
      let shown = 0;
      items.forEach(item => {
        const isCategory = category.startsWith('ALL') || item.dataset.category === category;
        const searchable = item.textContent.toLocaleLowerCase();
        const found = tokens.every(token => searchable.includes(token));
        item.hidden = !(isCategory && found);
        if (!item.hidden) shown++;
      });
      if (status) status.textContent = shown
        ? shown + ' of ' + items.length + ' dated reports shown.'
        : 'No dated reports match. Change your search or report type.';
    }
    filterButtons.forEach(button => button.addEventListener('click', () => {
      category = button.dataset.filter || 'ALL RESEARCH';
      filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      updateResearch();
    }));
    if (input) input.addEventListener('input', updateResearch);
    updateResearch();
  } else {
    const categories = ['SME','MAINBOARD','MAINBOARD','MAINBOARD','MAINBOARD','SME','MAINBOARD'];
    items.forEach((item,i) => { item.dataset.category = categories[i]; });
    filterButtons.forEach(button => button.addEventListener('click', () => {
      const choice = button.dataset.filter;
      filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      items.forEach(item => {
        const text = item.textContent.toUpperCase();
        item.hidden = !(choice.startsWith('ALL') || item.dataset.category === choice ||
          (choice === 'UPCOMING' && /OPENS|MONITOR/.test(text)) ||
          (choice === 'LISTED' && /LISTED|05 OCT LISTING/.test(text)));
      });
      const status = document.getElementById('filter-status');
      if (status) status.textContent = items.filter(i => !i.hidden).length + ' items shown · ' + choice.toLowerCase();
    }));
  }
}
const searchInput = document.getElementById('q');
if (searchInput) {
  const results = document.getElementById('results');
  const status = document.getElementById('search-status');
  let pages = [];
  function search() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    const matches = pages.filter(p => terms.every(term => p.join(' ').toLocaleLowerCase().includes(term)));
    results.replaceChildren();
    matches.forEach(([title,url,description]) => {
      const link = document.createElement('a'); link.href = url;
      const heading = document.createElement('b'); heading.textContent = title;
      const copy = document.createElement('span'); copy.textContent = description;
      link.append(heading,copy); results.append(link);
    });
    status.textContent = matches.length ? `${matches.length} pages found.` : 'No matching pages. Try an issuer name, IPO, privacy or sources.';
    const url = new URL(location.href);
    if(query) url.searchParams.set('q',searchInput.value.trim()); else url.searchParams.delete('q');
    history.replaceState(null,'',url);
  }
  fetch('search-index.json').then(r => { if(!r.ok) throw Error('unavailable'); return r.json(); }).then(data => {
    pages = data; searchInput.value = new URLSearchParams(location.search).get('q') || ''; search();
    document.getElementById('search-button').addEventListener('click',search);
    searchInput.addEventListener('input',search);
    searchInput.addEventListener('keydown',e => { if(e.key === 'Enter') { e.preventDefault(); search(); } });
  }).catch(() => { status.textContent = 'Search is temporarily unavailable. Please use the navigation to browse research.'; });
}
