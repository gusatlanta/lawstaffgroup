/* LawStaff Group — fractional counsel application (apply.html).
   FRACTIONAL_COUNSEL_v1 (Gus 10-24): a step-by-step application modeled on the
   HeyCounsel membership flow. Progress saves to this browser only; the finished
   application posts to the same public inquiry API as the site's other forms, so
   it lands in the recruiter inbox and emails the team. */
(function () {
  var API = 'https://100xrecruiting.com/api/public/inquiry';
  var DRAFT_KEY = 'lsg-counsel-application-v1';

  var US = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas',
    'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
    'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming', 'American Samoa', 'Guam', 'Northern Mariana Islands',
    'Puerto Rico', 'U.S. Virgin Islands'];
  var REGIONS = {
    'Canada': ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
      'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
      'Saskatchewan', 'Yukon'],
    'United Kingdom': ['England & Wales', 'Scotland', 'Northern Ireland'],
    'Australia': ['Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland',
      'South Australia', 'Tasmania', 'Victoria', 'Western Australia']
  };
  var COUNTRIES = ['Brazil', 'France', 'Germany', 'Hong Kong', 'India', 'Ireland', 'Israel', 'Italy', 'Japan',
    'Kenya', 'Mexico', 'Netherlands', 'New Zealand', 'Nigeria', 'Philippines', 'Singapore', 'South Africa',
    'Spain', 'Switzerland', 'United Arab Emirates'];

  var JURISDICTIONS = US.map(function (s) { return 'United States > ' + s; });
  Object.keys(REGIONS).forEach(function (c) {
    REGIONS[c].forEach(function (r) { JURISDICTIONS.push(c + ' > ' + r); });
  });
  JURISDICTIONS = JURISDICTIONS.concat(COUNTRIES);

  /* PRACTICE_80_20_v1 (Gus 10-24: "that is too much - 80/20 rule"): the practice areas most
     of our attorneys, paralegals and legal staff work in. Anything else, they type their own. */
  var PRACTICE = [
    'Banking & Finance', 'Bankruptcy & Restructuring', 'Commercial Contracts', 'Compliance & Regulatory',
    'Construction', 'Corporate / M&A', 'Criminal Defense', 'Employment & Labor', 'Family Law',
    'Government Contracts', 'Healthcare', 'Immigration', 'Insurance Defense', 'Intellectual Property',
    'Litigation', 'Medical Malpractice', 'Personal Injury', 'Privacy & Data Protection', 'Real Estate',
    'Securities', 'Startups & Venture Capital', 'Tax', 'Technology & SaaS', 'Trusts & Estates',
    'Workers\' Compensation'
  ];

  var OPTIONS = { jurisdictions: JURISDICTIONS, practice: PRACTICE };

  /* The role picked on the first step decides which steps and blocks apply
     (data-roles="attorney", "paralegal contracts assistant", …). */
  var ROLE_KEYS = {
    'Attorney / Counsel': 'attorney',
    'Paralegal': 'paralegal',
    'Contract Administrator / Manager': 'contracts',
    'Legal Assistant': 'assistant'
  };
  var X_ICON = '<svg class="ico" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  var form = document.getElementById('applyForm');
  if (!form) return;
  var steps = [].slice.call(form.querySelectorAll('.apply-step'));
  var total = steps.length;
  var current = 0;
  var returnToReview = false;
  var backBtn = document.getElementById('applyBack');
  var nextBtn = document.getElementById('applyNext');
  var skipBtn = document.getElementById('applySkip');
  var errorEl = document.getElementById('stepError');
  var savedEl = document.getElementById('applySaved');
  var savedAt = 0;
  var combos = {};

  function showError(msg) { errorEl.textContent = msg; }
  function clearError() { errorEl.textContent = ''; }

  function roleValue() {
    var r = form.querySelector('input[name="role"]:checked');
    return r ? r.value : '';
  }

  function roleKey() { return ROLE_KEYS[roleValue()] || 'attorney'; }

  function forRole(el) {
    var roles = el.getAttribute('data-roles');
    return !roles || roles.split(' ').indexOf(roleKey()) > -1;
  }

  function applyRole() {
    [].forEach.call(form.querySelectorAll('[data-roles]:not(.apply-step)'), function (el) {
      el.hidden = !forRole(el);
    });
  }

  /* Steps that apply to the chosen role, in order. */
  function route() { return steps.filter(forRole); }

  function neighbor(i, dir) {
    for (var j = i + dir; j >= 0 && j < total; j += dir) {
      if (forRole(steps[j])) return j;
    }
    return i;
  }

  /* ── Searchable multi-select ──────────────── */
  function makeCombo(root) {
    var input = root.querySelector('.combo-input');
    var list = root.querySelector('.combo-list');
    var hidden = root.querySelector('input[type="hidden"]');
    var chips = document.getElementById(root.id + 'Chips');
    var options = OPTIONS[root.dataset.options] || [];
    var max = +root.dataset.max || 0;
    var selected = [];
    var shown = [];
    var active = -1;

    function sync(fire) {
      hidden.value = selected.join('; ');
      chips.innerHTML = '';
      selected.forEach(function (v) {
        var chip = document.createElement('span');
        chip.className = 'combo-chip';
        chip.appendChild(document.createTextNode(v));
        var x = document.createElement('button');
        x.type = 'button';
        x.setAttribute('aria-label', 'Remove ' + v);
        x.innerHTML = X_ICON;
        x.addEventListener('click', function () { toggle(v); input.focus(); });
        chip.appendChild(x);
        chips.appendChild(chip);
      });
      updateCount(root.id, selected.length, max);
      if (fire) saveDraft();
    }

    function toggle(label) {
      var i = selected.indexOf(label);
      if (i > -1) {
        selected.splice(i, 1);
      } else if (max && selected.length >= max) {
        showError('You can choose up to ' + max + '. Remove one to add another.');
        return;
      } else {
        selected.push(label);
      }
      clearError();
      if (input.value) { input.value = ''; render(); }
      else markSelected();
      sync(true);
    }

    function markSelected() {
      [].forEach.call(list.querySelectorAll('.combo-opt'), function (li, i) {
        li.setAttribute('aria-selected', shown[i] && selected.indexOf(shown[i].label) > -1 ? 'true' : 'false');
      });
    }

    function render() {
      var raw = input.value.trim();
      var q = raw.toLowerCase();
      var terms = q.split(/\s+/).filter(Boolean);
      shown = options.filter(function (o) {
        var l = o.toLowerCase();
        return terms.every(function (t) { return l.indexOf(t) > -1; });
      }).map(function (o) { return { label: o }; });
      /* Offer "Add …" only for text that isn't already an option (or an option's last part). */
      var exists = options.concat(selected).some(function (o) {
        var l = o.toLowerCase();
        return l === q || l.split(' > ').pop() === q;
      });
      if (q && !exists) shown.push({ label: raw.replace(/;/g, ','), custom: true });

      list.innerHTML = '';
      if (!shown.length) {
        var empty = document.createElement('li');
        empty.className = 'combo-empty';
        empty.textContent = 'No matches';
        list.appendChild(empty);
      }
      shown.forEach(function (o, i) {
        var li = document.createElement('li');
        li.className = 'combo-opt';
        li.id = root.id + '-opt-' + i;
        li.setAttribute('role', 'option');
        var text = document.createElement('span');
        if (o.custom) {
          text.textContent = 'Add “' + o.label + '”';
        } else {
          var parts = o.label.split(' > ');
          if (parts.length > 1) {
            var parent = document.createElement('span');
            parent.className = 'combo-parent';
            parent.textContent = parts[0] + ' › ';
            text.appendChild(parent);
          }
          text.appendChild(document.createTextNode(parts[parts.length - 1]));
        }
        li.appendChild(text);
        li.addEventListener('click', function () { toggle(o.label); });
        list.appendChild(li);
      });
      markSelected();
      setActive(shown.length ? 0 : -1, true);
    }

    function setActive(i, noScroll) {
      var items = list.querySelectorAll('.combo-opt');
      if (items[active]) items[active].classList.remove('active');
      active = i;
      if (items[i]) {
        items[i].classList.add('active');
        input.setAttribute('aria-activedescendant', items[i].id);
        if (!noScroll) items[i].scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    function open() {
      if (!list.hidden) return;
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      render();
    }

    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }

    list.addEventListener('mousedown', function (e) { e.preventDefault(); }); /* keep focus in the input */
    input.addEventListener('focus', open);
    input.addEventListener('click', open);
    input.addEventListener('blur', close);
    input.addEventListener('input', function () { list.hidden ? open() : render(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (list.hidden) open(); else setActive(Math.min(active + 1, shown.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(Math.max(active - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault(); /* never submit the step from inside the search box */
        if (!list.hidden && shown[active]) toggle(shown[active].label);
      } else if (e.key === 'Escape') {
        if (!list.hidden) { e.preventDefault(); close(); }
      } else if (e.key === 'Backspace' && !input.value && selected.length) {
        toggle(selected[selected.length - 1]);
      }
    });

    return {
      input: input,
      min: +root.dataset.min || 0,
      msg: root.dataset.msg,
      count: function () { return selected.length; },
      load: function (value) {
        selected = (value || '').split('; ').filter(Boolean);
        if (max) selected = selected.slice(0, max);
        sync(false);
      }
    };
  }

  [].forEach.call(form.querySelectorAll('.combo'), function (root) { combos[root.id] = makeCombo(root); });

  var countryList = document.getElementById('countryList');
  ['United States', 'Canada', 'United Kingdom', 'Australia'].concat(COUNTRIES).forEach(function (c) {
    var o = document.createElement('option');
    o.value = c;
    countryList.appendChild(o);
  });

  /* ── Choice groups, counters, conditionals ── */
  function updateCount(key, n, max) {
    var el = form.querySelector('[data-count-for="' + key + '"]');
    if (el && max) el.textContent = n + ' of ' + max + ' selected';
  }

  function refreshGroup(group) {
    updateCount(group.dataset.group, group.querySelectorAll('input:checked').length, +group.dataset.max || 0);
  }

  function refreshCounter(el) {
    var note = form.querySelector('[data-counter-for="' + el.id + '"]');
    if (!note) return;
    var len = el.value.trim().length;
    var min = +el.dataset.min || 0;
    note.textContent = len + ' / ' + el.maxLength + ' characters' + (min && len < min ? ' (minimum ' + min + ')' : '');
    note.classList.toggle('is-ok', !!min && len >= min);
  }

  var disciplineBox = document.getElementById('disciplineDetails');
  var disciplineText = document.getElementById('a-discipline');
  function refreshDiscipline() {
    var yes = !!form.querySelector('input[name="discipline"][value^="Yes"]:checked');
    disciplineBox.hidden = !yes;
    disciplineText.required = yes;
  }

  function normalizeUrl(el) {
    var v = el.value.trim();
    if (!v) return;
    if (el.hasAttribute('data-linkedin') && !/[./]/.test(v)) v = 'https://www.linkedin.com/in/' + v.replace(/^@/, '');
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    el.value = v;
  }

  form.addEventListener('change', function (e) {
    var t = e.target;
    var group = t.closest('[data-group]');
    if (group && t.type === 'checkbox') {
      var max = +group.dataset.max || 0;
      if (max && group.querySelectorAll('input:checked').length > max) {
        t.checked = false;
        showError('Choose up to ' + max + '.');
      } else {
        clearError();
      }
      refreshGroup(group);
    }
    if (t.name === 'discipline') refreshDiscipline();
    if (t.name === 'role') { applyRole(); refreshProgress(); }
    if (t.hasAttribute('data-url') || t.hasAttribute('data-linkedin')) normalizeUrl(t);
    saveDraft();
  });

  form.addEventListener('input', function (e) {
    if (e.target.tagName === 'TEXTAREA') refreshCounter(e.target);
    if (!e.target.classList.contains('combo-input')) saveDraft();
  });

  /* ── Reading the answers ──────────────────── */
  function display(el) {
    var group = el.matches('[data-group]');
    var value;
    if (group) {
      value = [].map.call(el.querySelectorAll('input:checked'), function (i) { return i.value; }).join('; ');
    } else if (el.type === 'checkbox') {
      value = el.checked ? (el.dataset.on || el.value) : '';
    } else {
      value = el.value.trim();
    }
    if (value && el.dataset.format) value = el.dataset.format.replace('%', value);
    return value;
  }

  function answers(step) {
    return [].filter.call(step.querySelectorAll('[data-label]'), function (el) {
      return !el.closest('[hidden]:not(.apply-step)') && !(el.matches('[data-group] input'));
    }).map(function (el) { return { label: el.dataset.label, value: display(el) }; });
  }

  function stepTitle(step) { return step.querySelector('h3').textContent.trim(); }

  function values() {
    var out = {};
    [].forEach.call(form.elements, function (el) {
      if (!el.name || el.name === 'hp_website') return;
      if (el.type === 'checkbox') {
        out[el.name] = out[el.name] || [];
        if (el.checked) out[el.name].push(el.value);
      } else if (el.type === 'radio') {
        if (el.checked) out[el.name] = el.value;
      } else {
        out[el.name] = el.value;
      }
    });
    return out;
  }

  function field(name) { var el = form.elements[name]; return el ? el.value.trim() : ''; }

  /* ── Draft: saved to this browser only ────── */
  function relTime(t) {
    var s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    var m = Math.round(s / 60);
    if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
    var h = Math.round(m / 60);
    if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    return 'on ' + new Date(t).toLocaleDateString();
  }

  function renderSaved() {
    if (savedAt) savedEl.textContent = 'Progress saved on this device · ' + relTime(savedAt);
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ step: current, values: values(), at: Date.now() }));
      savedAt = Date.now();
      renderSaved();
    } catch (err) { /* private mode or storage blocked: the form still works */ }
  }

  function loadDraft() {
    var draft;
    try { draft = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || 'null'); } catch (err) { draft = null; }
    if (!draft || !draft.values) return 0;
    var v = draft.values;
    [].forEach.call(form.elements, function (el) {
      if (!el.name || !(el.name in v)) return;
      if (el.type === 'checkbox') el.checked = (v[el.name] || []).indexOf(el.value) > -1;
      else if (el.type === 'radio') el.checked = v[el.name] === el.value;
      else el.value = v[el.name];
    });
    Object.keys(combos).forEach(function (id) {
      combos[id].load(document.getElementById(id).querySelector('input[type="hidden"]').value);
    });
    savedAt = draft.at || 0;
    applyRole();
    var step = Math.min(Math.max(+draft.step || 0, 0), total - 1);
    return forRole(steps[step]) ? step : 0;
  }

  function clearDraft() {
    try { window.localStorage.removeItem(DRAFT_KEY); } catch (err) { /* nothing to clear */ }
  }

  /* ── Validation ───────────────────────────── */
  function fail(el, msg) {
    showError(msg);
    if (el) el.focus();
    return false;
  }

  function validate(step) {
    var fields = step.querySelectorAll('input, select, textarea');
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (f.type === 'hidden' || f.closest('[hidden]:not(.apply-step)') || f.closest('[data-group]')) continue;
      if (f.hasAttribute('data-linkedin') && f.value.trim()) {
        normalizeUrl(f);
        if (!/linkedin\.com\//i.test(f.value)) return fail(f, 'Please enter a LinkedIn username or a linkedin.com profile URL.');
      }
      if (!f.checkValidity()) {
        var name = f.labels && f.labels[0] ? f.labels[0].textContent.replace(/\s*\(optional\)\s*/i, '').trim() : 'this field';
        var missing = (f.tagName === 'SELECT' ? 'Please choose ' : 'Please fill in ') + name + '.';
        return fail(f, f.dataset.msg || (f.validity.valueMissing ? missing : f.validationMessage));
      }
      var min = +f.dataset.min || 0;
      if (min && f.value.trim().length < min) return fail(f, 'Please write at least ' + min + ' characters.');
    }
    var groups = step.querySelectorAll('[data-group]');
    for (var g = 0; g < groups.length; g++) {
      if (groups[g].closest('[hidden]:not(.apply-step)')) continue;
      var need = +groups[g].dataset.min || 0;
      if (need && groups[g].querySelectorAll('input:checked').length < need) {
        return fail(groups[g].querySelector('input'), groups[g].dataset.msg || 'Choose at least one.');
      }
    }
    var roots = step.querySelectorAll('.combo');
    for (var c = 0; c < roots.length; c++) {
      var combo = combos[roots[c].id];
      if (combo.count() < combo.min) return fail(combo.input, combo.msg);
    }
    return true;
  }

  /* ── Navigation ───────────────────────────── */
  function buildReview() {
    var dl = document.getElementById('reviewList');
    dl.innerHTML = '';
    route().slice(0, -1).forEach(function (step) {
      var i = steps.indexOf(step);
      var parts = answers(step).map(function (a) {
        return a.value.length > 160 ? a.value.slice(0, 157) + '…' : a.value;
      }).filter(Boolean);
      var dt = document.createElement('dt');
      dt.textContent = stepTitle(step);
      var dd = document.createElement('dd');
      var text = document.createElement('span');
      text.textContent = parts.length ? parts.join(' · ') : 'Skipped';
      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'review-edit';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', 'Edit ' + stepTitle(step));
      edit.addEventListener('click', function () { returnToReview = true; goTo(i); });
      dd.appendChild(text);
      dd.appendChild(edit);
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
  }

  function refreshProgress() {
    var path = route();
    var n = path.indexOf(steps[current]) + 1;
    var bar = document.getElementById('progress');
    document.getElementById('stepCount').textContent = 'Step ' + n + ' of ' + path.length;
    bar.setAttribute('aria-valuenow', n);
    bar.setAttribute('aria-valuemax', path.length);
    document.getElementById('progressBar').style.width = (n / path.length * 100) + '%';
  }

  function goTo(i, focus) {
    steps[current].hidden = true;
    current = i;
    steps[i].hidden = false;
    clearError();
    var last = i === total - 1;
    backBtn.classList.toggle('is-hidden', i === 0 || returnToReview);
    skipBtn.hidden = !steps[i].hasAttribute('data-optional') || returnToReview;
    nextBtn.textContent = last ? 'Submit Application' : (returnToReview ? 'Save & Return to Review' : 'Continue');
    refreshProgress();
    if (last) { returnToReview = false; buildReview(); }
    if (focus === false) return;
    saveDraft();
    var head = document.querySelector('.apply-progress-head');
    if (head.getBoundingClientRect().top < 0) head.scrollIntoView({ behavior: 'smooth', block: 'start' });
    steps[i].querySelector('h3').focus({ preventScroll: true });
  }

  backBtn.addEventListener('click', function () { goTo(neighbor(current, -1)); });
  skipBtn.addEventListener('click', function () { goTo(neighbor(current, 1)); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate(steps[current])) return;
    if (returnToReview) { goTo(total - 1); return; }
    if (current < total - 1) { goTo(neighbor(current, 1)); return; }
    /* An edit from the review (e.g. a new role) can leave an earlier step incomplete. */
    var path = route();
    for (var k = 0; k < path.length - 1; k++) {
      if (!validate(path[k])) {
        returnToReview = true;
        goTo(steps.indexOf(path[k]));
        validate(path[k]);
        return;
      }
    }
    send();
  });

  /* ── Submit ───────────────────────────────── */
  function buildNotes() {
    var lines = ['FRACTIONAL TALENT APPLICATION: ' + roleValue().toUpperCase(), 'Site: LawStaffGroup.net', ''];
    route().forEach(function (step) {
      var items = answers(step).filter(function (a) { return a.value; });
      if (!items.length) return;
      lines.push('— ' + stepTitle(step) + ' —');
      items.forEach(function (a) { lines.push(a.label + ': ' + a.value); });
      lines.push('');
    });
    lines.push('Next step: set up their video interview (' + field('email') + ').');
    return lines.join('\n');
  }

  async function send() {
    var name = (field('first_name') + ' ' + field('last_name')).trim();
    nextBtn.disabled = true;
    nextBtn.textContent = 'Submitting…';
    try {
      var res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employer_name:    name,
          employer_email:   field('email'),
          employer_company: roleValue() + ' applicant — ' + name,
          inquiry_type:     'lawstaff-' + roleKey() + '-application',
          candidate_id:     '',
          hp_website:       field('hp_website'),
          notes:            buildNotes(),
        }),
      });
      var json = await res.json().catch(function () { return {}; });
      if (!json.ok) throw new Error(json.error || 'server error');
      done();
    } catch (err) {
      nextBtn.disabled = false;
      nextBtn.textContent = 'Submit Application';
      showError('Something went wrong sending your application. Please try again, or call 404-250-0790 or email gus@stafffinancial.com.');
    }
  }

  function done() {
    var email = field('email');
    clearDraft();
    savedAt = 0;   /* stop the 'Progress saved … ago' timer overwriting the Submitted line */
    form.hidden = true;
    document.getElementById('doneEmail').textContent = email;
    document.getElementById('applyDone').hidden = false;
    document.getElementById('applyStatus').classList.add('status-pill--done');
    document.getElementById('applyStatusText').textContent = 'Submitted';
    document.getElementById('stepCount').textContent = 'Complete';
    document.getElementById('progressBar').style.width = '100%';
    document.getElementById('progress').setAttribute('aria-valuenow', total);
    savedEl.textContent = 'Submitted ' + new Date().toLocaleDateString();
    document.getElementById('doneTitle').focus();
  }

  /* ── Start ────────────────────────────────── */
  applyRole();
  var start = loadDraft();
  [].forEach.call(form.querySelectorAll('[data-group]'), refreshGroup);
  [].forEach.call(form.querySelectorAll('textarea'), refreshCounter);
  refreshDiscipline();
  steps.forEach(function (s, i) { s.hidden = i !== start; });
  current = start;
  goTo(start, false);
  renderSaved();
  window.setInterval(renderSaved, 30000);
})();
