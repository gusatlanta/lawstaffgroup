/* LawStaff Group — application (apply.html).
   LAWSTAFF_FILE_v1 (Gus 10-24: "we want our own finger prints on this"): the
   application is a candidate file with tabs A-G. Answers save to this browser
   until sent (all but the résumé file). The finished file and résumé go to
   100X's LawStaff door (LAWSTAFF_DOORS_v1), which makes the candidate, sends them
   to PCR and answers with a record-your-video link; if that door is missing it
   falls back to the public inquiry inbox like the site's other forms. */
(function () {
  var API = 'https://100xrecruiting.com/api/public/inquiry';
  var APPLY_DOOR = 'https://100xrecruiting.com/api/public/lawstaff/apply';
  var DRAFT_KEY = 'lawstaff-file-v1';
  var RESUME_MAX = 10 * 1024 * 1024;
  var MAX_AREAS = 5;

  var STATES = [['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
    ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'],
    ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
    ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
    ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'],
    ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'],
    ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
    ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
    ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'],
    ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming']];

  /* PRACTICE_80_20_v1 (Gus 10-24: "that is too much - 80/20 rule"): the areas most of
     our attorneys, paralegals and legal staff work in. Anything else, they type their own. */
  var AREAS = [
    'Banking & Finance', 'Bankruptcy & Restructuring', 'Commercial Contracts', 'Compliance & Regulatory',
    'Construction', 'Corporate / M&A', 'Criminal Defense', 'Employment & Labor', 'Family Law',
    'Government Contracts', 'Healthcare', 'Immigration', 'Insurance Defense', 'Intellectual Property',
    'Litigation', 'Medical Malpractice', 'Personal Injury', 'Privacy & Data Protection', 'Real Estate',
    'Securities', 'Startups & Venture Capital', 'Tax', 'Technology & SaaS', 'Trusts & Estates',
    'Workers’ Compensation'
  ];

  var ROLE_KEYS = {
    'Attorney': 'attorney',
    'Paralegal': 'paralegal',
    'Contracts Professional': 'contracts',
    'Legal Assistant': 'assistant'
  };
  var CHECK = '<svg class="ico" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  var form = document.getElementById('lsaForm');
  if (!form) return;
  var tabs = [].slice.call(form.querySelectorAll('.lsa-tab'));
  var last = tabs.length - 1;
  var current = 0;
  var furthest = 0;
  var savedAt = 0;
  var tabList = document.getElementById('lsaTabs');
  var errorEl = document.getElementById('lsaError');
  var backBtn = document.getElementById('lsaBack');
  var nextBtn = document.getElementById('lsaNext');
  var savedEl = document.getElementById('lsaSaved');

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function showError(msg) { errorEl.textContent = msg; }
  function clearError() { errorEl.textContent = ''; }

  /* ── Option lists ─────────────────────────── */
  var stateSelect = document.getElementById('f-state');
  STATES.forEach(function (s) {
    var o = el('option', null, s[1]);
    o.value = s[1];
    stateSelect.appendChild(o);
  });
  stateSelect.appendChild(new Option('Outside the US', 'Outside the US'));

  var chipBox = document.getElementById('stateChips');
  STATES.forEach(function (s) {
    var chip = el('label', 'lsa-chip');
    chip.title = s[1];
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.name = 'licenses';
    box.value = s[0];
    box.setAttribute('aria-label', s[1]);
    chip.appendChild(box);
    chip.appendChild(el('span', null, s[0]));
    chipBox.appendChild(chip);
  });

  var areaGrid = document.getElementById('areaGrid');
  AREAS.forEach(function (a) {
    var opt = el('label', 'lsa-opt');
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.name = 'areas';
    box.value = a;
    opt.appendChild(box);
    opt.appendChild(el('span', null, a));
    areaGrid.appendChild(opt);
  });

  /* ── Reading answers ──────────────────────── */
  function checked(name) {
    return [].map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
  }

  function roleKey() { return ROLE_KEYS[checked('role')[0]] || ''; }

  /* Active = not inside a block hidden by role or by a follow-up rule. */
  function active(node) {
    for (var n = node; n && n !== form; n = n.parentElement) {
      if (n.classList.contains('lsa-tab')) return true;
      if (n.hidden) return false;
    }
    return true;
  }

  function matches(rule) {
    return rule.split('|').some(function (part) {
      var eq = part.indexOf('=');
      var name = part.slice(0, eq);
      var want = part.slice(eq + 1);
      var field = form.elements[name];
      if (!field) return false;
      if (field.tagName === 'SELECT') return field.value === want;
      return checked(name).indexOf(want) > -1;
    });
  }

  function applyRules() {
    var key = roleKey();
    [].forEach.call(form.querySelectorAll('[data-roles]'), function (b) {
      b.hidden = !key || b.getAttribute('data-roles').split(' ').indexOf(key) < 0;
    });
    [].forEach.call(form.querySelectorAll('[data-show-if]'), function (b) {
      b.hidden = !matches(b.getAttribute('data-show-if'));
    });
  }

  function fieldValue(node) {
    var v;
    if (node.tagName === 'FIELDSET') {
      v = [].map.call(node.querySelectorAll('input:checked'), function (i) { return i.value; }).join(', ');
    } else if (node.type === 'checkbox') {
      v = node.checked ? (node.dataset.on || node.value) : '';
    } else if (node.type === 'file') {
      v = node.files && node.files[0] ? node.files[0].name : '';
    } else {
      v = node.value.trim();
    }
    if (v && node.dataset.format) v = node.dataset.format.replace('%', Number(v).toLocaleString('en-US'));
    return v;
  }

  function answers(tab) {
    return [].filter.call(tab.querySelectorAll('[data-label]'), active).map(function (node) {
      return { label: node.dataset.label, value: fieldValue(node) };
    }).filter(function (a) { return a.value; });
  }

  function tabTitle(tab) { return tab.dataset.title.replace('&amp;', '&'); }
  function letter(i) { return String.fromCharCode(65 + i); }

  /* ── Practice areas: count + cap ──────────── */
  var areaCount = document.getElementById('areaCount');

  function refreshAreas() {
    var n = checked('areas').length;
    areaCount.textContent = n + ' of ' + MAX_AREAS;
    areaCount.classList.toggle('is-full', n >= MAX_AREAS);
  }

  /* ── Small helpers ────────────────────────── */
  function counter(area) {
    var note = form.querySelector('[data-counter-for="' + area.id + '"]');
    if (!note) return;
    var len = area.value.trim().length;
    var min = +area.dataset.min || 0;
    note.textContent = len < min ? (min - len) + ' more characters to go' : len + ' / ' + area.maxLength;
    note.classList.toggle('is-ok', len >= min);
  }

  function tidyUrl(input) {
    var v = input.value.trim();
    if (!v) return;
    if (input.hasAttribute('data-linkedin') && !/[./]/.test(v)) v = 'linkedin.com/in/' + v.replace(/^@/, '');
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    input.value = v;
  }

  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'areas') {
      if (t.checked && checked('areas').length > MAX_AREAS) {
        t.checked = false;
        showError('Five is the limit. Uncheck one to swap it.');
      } else {
        clearError();
      }
      refreshAreas();
    }
    if (t.hasAttribute('data-url') || t.hasAttribute('data-linkedin')) tidyUrl(t);
    applyRules();
    saveDraft();
  });

  form.addEventListener('input', function (e) {
    if (e.target.tagName === 'TEXTAREA') counter(e.target);
    saveDraft();
  });

  /* ── Draft (this browser only) ────────────── */
  function snapshot() {
    var out = {};
    [].forEach.call(form.elements, function (f) {
      if (!f.name || f.name === 'hp_website' || f.type === 'file') return;   /* a file can't go in a draft */
      if (f.type === 'checkbox') {
        out[f.name] = out[f.name] || [];
        if (f.checked) out[f.name].push(f.value);
      } else if (f.type === 'radio') {
        if (f.checked) out[f.name] = f.value;
      } else {
        out[f.name] = f.value;
      }
    });
    return out;
  }

  function ago(t) {
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    return h < 24 ? h + ' hr ago' : new Date(t).toLocaleDateString();
  }

  function showSaved() {
    if (savedAt) savedEl.textContent = 'Saved on this device · ' + ago(savedAt);
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: snapshot(), tab: current, furthest: furthest, at: Date.now() }));
      savedAt = Date.now();
      showSaved();
    } catch (err) { /* storage blocked: the form still works */ }
  }

  function loadDraft() {
    var d;
    try { d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (err) { d = null; }
    if (!d || !d.v) return;
    [].forEach.call(form.elements, function (f) {
      if (!f.name || !(f.name in d.v) || f.type === 'file') return;
      if (f.type === 'checkbox') f.checked = (d.v[f.name] || []).indexOf(f.value) > -1;
      else if (f.type === 'radio') f.checked = d.v[f.name] === f.value;
      else f.value = d.v[f.name];
    });
    savedAt = d.at || 0;
    furthest = Math.min(Math.max(+d.furthest || 0, 0), last);
    current = Math.min(Math.max(+d.tab || 0, 0), furthest);
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (err) { /* nothing saved */ }
  }

  /* ── Checking a tab ───────────────────────── */
  function stop(node, msg, quiet) {
    if (quiet) return false;
    showError(msg);
    if (node) node.focus();
    return false;
  }

  function check(tab, quiet) {
    var fields = tab.querySelectorAll('input, select, textarea');
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (f.type === 'hidden' || !active(f) || f.closest('fieldset.lsa-q')) continue;
      if (f.type === 'file' && f.files && f.files[0]) {
        if (!/\.(pdf|docx?)$/i.test(f.files[0].name)) return stop(f, 'Please attach your résumé as a PDF or Word file.', quiet);
        if (f.files[0].size > RESUME_MAX) return stop(f, 'Please attach a résumé under 10 MB.', quiet);
      }
      if (f.hasAttribute('data-linkedin') && f.value.trim()) {
        tidyUrl(f);
        if (!/linkedin\.com\//i.test(f.value)) return stop(f, 'That LinkedIn link doesn’t look right. Try linkedin.com/in/your-name.', quiet);
      }
      if (!f.checkValidity()) {
        var name = f.labels && f.labels[0] ? f.labels[0].textContent.replace(/optional/i, '').trim() : 'this';
        var msg = f.dataset.msg || (f.validity.valueMissing
          ? (f.tagName === 'SELECT' ? 'Please choose ' : 'Please fill in ') + name.charAt(0).toLowerCase() + name.slice(1) + '.'
          : f.validationMessage);
        return stop(f, msg, quiet);
      }
      var min = +f.dataset.min || 0;
      if (min && f.value.trim().length < min) return stop(f, f.dataset.msg || 'Please write a little more.', quiet);
    }
    var groups = tab.querySelectorAll('fieldset.lsa-q');
    for (var g = 0; g < groups.length; g++) {
      if (!active(groups[g])) continue;
      var need = +groups[g].dataset.min || 0;
      var or = groups[g].dataset.or;   /* e.g. practice areas: a typed-in area counts too */
      if (need && groups[g].querySelectorAll('input:checked').length < need && !(or && field(or))) {
        var first = groups[g].querySelector('input:not([type="search"])');
        return stop(first, groups[g].dataset.msg || 'Please pick one.', quiet);
      }
    }
    return true;
  }

  /* ── The file index (tabs A-G) ────────────── */
  function renderIndex() {
    tabList.innerHTML = '';
    tabs.forEach(function (tab, i) {
      var li = el('li');
      var b = el('button', 'lsa-tabbtn');
      b.type = 'button';
      b.disabled = i > furthest;
      if (i === current) { b.classList.add('is-current'); b.setAttribute('aria-current', 'step'); }
      var done = i !== current && i <= furthest && check(tab, true);
      if (done) b.classList.add('is-done');
      var badge = el('span', 'lsa-letter');
      if (done) badge.innerHTML = CHECK; else badge.textContent = letter(i);
      b.appendChild(badge);
      b.appendChild(el('span', 'lsa-tabname', tabTitle(tab)));
      b.setAttribute('aria-label', 'Tab ' + letter(i) + ': ' + tabTitle(tab) + (done ? ', done' : ''));
      b.addEventListener('click', function () { jump(i); });
      li.appendChild(b);
      tabList.appendChild(li);
    });
    /* On phones the index is one scrolling row: keep the open tab in view. */
    var cur = tabList.querySelector('.is-current');
    if (cur && tabList.scrollWidth > tabList.clientWidth) {
      tabList.scrollLeft += cur.getBoundingClientRect().left - tabList.getBoundingClientRect().left - 8;
    }
  }

  function show(i, focus) {
    tabs[current].hidden = true;
    current = i;
    tabs[i].hidden = false;
    clearError();
    if (i > furthest) furthest = i;
    backBtn.classList.toggle('is-hidden', i === 0);
    nextBtn.textContent = i === last ? 'Send my application' : 'Save & continue';
    if (i === last) buildReview();
    renderIndex();
    if (focus === false) return;
    saveDraft();
    var top = document.querySelector('.lsa-layout');
    if (top.getBoundingClientRect().top < 0) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
    tabs[i].querySelector('h2').focus({ preventScroll: true });
  }

  /* Going forward re-checks every tab on the way, so an edit can't skip a gap. */
  function jump(i) {
    if (i <= current) { show(i); return; }
    for (var k = current; k < i; k++) {
      if (!check(tabs[k], true)) {
        if (k !== current) show(k);
        check(tabs[k]);
        return;
      }
    }
    show(i);
  }

  function buildReview() {
    var box = document.getElementById('lsaReview');
    box.innerHTML = '';
    tabs.slice(0, last).forEach(function (tab, i) {
      var block = el('div', 'lsa-review-block');
      var head = el('div', 'lsa-review-head');
      head.appendChild(el('span', 'lsa-letter', letter(i)));
      head.appendChild(el('strong', null, tabTitle(tab)));
      var change = el('button', 'lsa-change', 'Change');
      change.type = 'button';
      change.setAttribute('aria-label', 'Change ' + tabTitle(tab));
      change.addEventListener('click', function () { show(i); });
      head.appendChild(change);
      block.appendChild(head);
      var dl = el('dl');
      answers(tab).forEach(function (a) {
        dl.appendChild(el('dt', null, a.label));
        dl.appendChild(el('dd', null, a.value.length > 220 ? a.value.slice(0, 217) + '…' : a.value));
      });
      block.appendChild(dl);
      box.appendChild(block);
    });
  }

  backBtn.addEventListener('click', function () { if (current > 0) show(current - 1); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!check(tabs[current])) return;
    if (current < last) { show(current + 1); return; }
    for (var k = 0; k < last; k++) {
      if (!check(tabs[k], true)) { show(k); check(tabs[k]); return; }
    }
    send();
  });

  /* ── Sending ──────────────────────────────── */
  function field(name) { var f = form.elements[name]; return f && f.value ? f.value.trim() : ''; }

  function notes() {
    var role = checked('role')[0] || '';
    var lines = ['LAWSTAFF APPLICATION — ' + role.toUpperCase(), 'Site: LawStaffGroup.net', ''];
    tabs.slice(0, last).forEach(function (tab, i) {
      var items = answers(tab);
      if (!items.length) return;
      lines.push(letter(i) + '. ' + tabTitle(tab).toUpperCase());
      items.forEach(function (a) { lines.push(a.label + ': ' + a.value); });
      lines.push('');
    });
    lines.push('Consent: answers are true; OK to check references and license status; ask before each client submission.');
    lines.push('Next step: set up their video interview (' + field('email') + ').');
    return lines.join('\n');
  }

  /* LAWSTAFF_DOORS_v1: the file and résumé go to 100X's LawStaff door. null when that
     door isn't there (404 / network), so send() can still reach the inquiry inbox. */
  async function sendToDoor() {
    var fd = new FormData();
    ['first_name', 'last_name', 'email', 'phone', 'hp_website'].forEach(function (k) { fd.append(k, field(k)); });
    fd.append('role', roleKey());
    fd.append('notes', notes());
    var file = form.elements.resume && form.elements.resume.files[0];
    if (file) fd.append('resume', file);
    var res = await fetch(APPLY_DOOR, { method: 'POST', body: fd }).catch(function () { return null; });
    if (!res || res.status === 404 || res.status === 405) return null;
    return res.json().catch(function () { return { ok: false }; });
  }

  async function send() {
    var name = (field('first_name') + ' ' + field('last_name')).trim();
    var role = checked('role')[0] || '';
    nextBtn.disabled = true;
    nextBtn.textContent = 'Sending…';
    try {
      var json = await sendToDoor();
      if (!json) {
        var res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employer_name: name,
            employer_email: field('email'),
            employer_company: role + ' applicant — ' + name,
            inquiry_type: 'lawstaff-' + (roleKey() || 'talent') + '-application',
            candidate_id: '',
            hp_website: field('hp_website'),
            notes: notes()
          })
        });
        json = await res.json().catch(function () { return {}; });
      }
      if (!json.ok) {
        var bad = new Error(json.error || '');
        bad.fromServer = true;
        throw bad;
      }
      finish(name, json.video_link || '');
    } catch (err) {
      nextBtn.disabled = false;
      nextBtn.textContent = 'Send my application';
      showError(err && err.fromServer && err.message ? err.message
        : 'Your application didn’t go through. Please try again, or call 404-250-0790 or email gus@stafffinancial.com.');
    }
  }

  function finish(name, videoLink) {
    var email = field('email');
    clearDraft();
    savedAt = 0;   /* stop the 'Saved on this device … ago' timer overwriting the Sent line */
    form.hidden = true;
    if (videoLink) {   /* the door answered with a record link: offer it right here */
      document.getElementById('doneManual').hidden = true;
      document.getElementById('doneVideo').hidden = false;
      document.getElementById('doneVideoLink').href = videoLink;
    }
    [].forEach.call(document.querySelectorAll('#lsaDone .doneName'), function (n) { n.textContent = field('first_name') || name; });
    [].forEach.call(document.querySelectorAll('#lsaDone .doneEmail'), function (n) { n.textContent = email; });
    document.getElementById('lsaDone').hidden = false;
    furthest = last;
    current = last;
    [].forEach.call(tabList.querySelectorAll('.lsa-tabbtn'), function (b) {
      b.disabled = true;
      b.classList.remove('is-current');
      b.classList.add('is-done');
      b.querySelector('.lsa-letter').innerHTML = CHECK;
    });
    savedEl.textContent = 'Sent ' + new Date().toLocaleDateString();
    document.getElementById('doneTitle').focus();
  }

  /* ── Start ────────────────────────────────── */
  loadDraft();
  applyRules();
  refreshAreas();
  [].forEach.call(form.querySelectorAll('textarea'), counter);
  tabs.forEach(function (t, i) { t.hidden = i !== current; });
  show(current, false);
  showSaved();
  window.setInterval(showSaved, 30000);
})();
