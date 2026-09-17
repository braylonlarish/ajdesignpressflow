// Product search and safe, local BendBot actions.
setTimeout(() => {
  const searchInput = document.querySelector('#product-search');
  const filterProducts = () => {
    const query = searchInput.value.trim().toLowerCase();
    document.querySelectorAll('#products-table tr').forEach(row => {
      row.hidden = !!query && !row.textContent.toLowerCase().includes(query);
    });
  };
  searchInput.addEventListener('input', filterProducts);
  const baseRenderProducts = renderProducts;
  renderProducts = function () {
    baseRenderProducts();
    filterProducts();
  };

  const audit = message => {
    data.changeLog = data.changeLog || [];
    data.changeLog.unshift({
      message,
      when: new Date().toLocaleString(),
      by: currentSession?.user?.user_metadata?.full_name || currentSession?.user?.email || 'A+J employee'
    });
  };
  const findProduct = text => data.products.find(product => text.includes(product.part.toLowerCase()));
  const respond = message => { document.querySelector('#bendbot-response').textContent = message; };
  const openSearch = query => {
    go('products');
    searchInput.value = query;
    filterProducts();
    const matches = data.products.filter(product => `${product.part} ${product.name} ${product.assembly || ''}`.toLowerCase().includes(query.toLowerCase()));
    respond(matches.length ? `I found ${matches.length} matching job${matches.length === 1 ? '' : 's'} for “${query}” in Products.` : `No jobs match “${query}.”`);
  };
  const saveChange = message => { audit(message); save(); renderAll(); };
  const previousBendbotReply = bendbotReply;
  bendbotReply = function (request) {
    const raw = String(request || '').trim();
    const text = raw.toLowerCase();
    if (!raw) return previousBendbotReply(request);
    if (/what can you do|what.*help.*with/.test(text)) {
      respond('I can search parts, open schedule areas, rebuild schedules, show capacity, mark a part Ready, In progress, or Complete, add a note, lock or unlock a part, lock or unlock the full schedule, and export the schedule. Try “search BP-1042” or “mark BP-1042 complete.”');
      return;
    }
    const searchMatch = raw.match(/^(?:search|find|look up|lookup)s+(?:fors+)?(.+)$/i);
    if (searchMatch) return openSearch(searchMatch[1]);
    if (/^(?:open|show)s+(?:thes+)?(?:job|part|product)s+(?:search|searches)/i.test(raw)) {
      go('products'); searchInput.focus(); respond('I opened Products. Enter a part number, assembly number, or product name in the search box.'); return;
    }
    const product = findProduct(text);
    const status = /\bcomplete(?:d)?\b/.test(text) ? 'Complete' : /\bin[ -]?progress\b/.test(text) ? 'In progress' : /\bready\b/.test(text) ? 'Ready' : null;
    if (product && status && /\b(?:mark|set|change)\b/.test(text)) {
      product.status = status;
      saveChange(`${product.part} marked ${status}`);
      respond(`${product.part} is now marked ${status}.`);
      return;
    }
    const noteMatch = raw.match(/^(?:add |set )?note(?: for)?\s+(.+?)\s*[:=-]\s*(.+)$/i);
    if (noteMatch) {
      const notedProduct = findProduct(noteMatch[1].toLowerCase());
      if (!notedProduct) { respond('I could not find that part number for the note.'); return; }
      notedProduct.note = noteMatch[2].trim();
      saveChange(`Updated note for ${notedProduct.part}`);
      respond(`Saved the note for ${notedProduct.part}.`);
      return;
    }
    if (/\b(?:lock|unlock)\b.*\bfull (?:schedule|plan)\b|\b(?:lock|unlock)\b.*\b(?:schedule|plan)\b/.test(text)) {
      const unlock = /\bunlock\b/.test(text);
      if (unlock) {
        data.products.forEach(job => { job.locked = false; job.lockedPress = null; });
        data.scheduleLocked = false;
        saveChange('Unlocked the full schedule');
        respond('The full schedule is now unlocked.');
      } else {
        Object.entries(plan().loads).forEach(([pressId, jobs]) => jobs.forEach(job => { job.product.locked = true; job.product.lockedPress = +pressId; }));
        data.scheduleLocked = true;
        saveChange('Locked every currently assigned part in the full schedule');
        respond('All currently assigned parts are locked in place.');
      }
      return;
    }
    if (product && /\b(?:lock|unlock)\b/.test(text)) {
      if (/\bunlock\b/.test(text)) {
        product.locked = false; product.lockedPress = null;
        saveChange(`Unlocked ${product.part}`);
        respond(`${product.part} is unlocked.`);
      } else {
        const assignment = Object.entries(plan().loads).flatMap(([pressId, jobs]) => jobs.map(job => ({ pressId: +pressId, job }))).find(item => item.job.product.id === product.id);
        if (!assignment) { respond(`${product.part} is not currently assigned. Build the schedule first, then lock it.`); return; }
        product.locked = true; product.lockedPress = assignment.pressId;
        saveChange(`Locked ${product.part} on ${data.presses.find(press => press.id === assignment.pressId).name}`);
        respond(`${product.part} is locked on ${data.presses.find(press => press.id === assignment.pressId).name}.`);
      }
      return;
    }
    if (/\b(?:export|download)\b.*\b(?:schedule|csv|data)\b/.test(text)) {
      go('floor-board');
      setTimeout(() => document.querySelector('#export-production')?.click(), 0);
      respond('I prepared a CSV schedule export. Your browser should download it now.');
      return;
    }
    if (/\b(?:open|show)\b.*\bfloor (?:board|view)\b/.test(text)) {
      go('floor-board'); respond('I opened the Floor board.'); return;
    }
    previousBendbotReply(request);
  };
  renderAll();
}, 50);
