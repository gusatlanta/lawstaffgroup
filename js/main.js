/* LawStaff Group — Main JS (loaded on every page) */

(function () {
  // Scroll-aware navbar
  var navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.querySelector('.nav-menu');
  if (toggle && menu && navbar) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', function (e) {
      if (!navbar.contains(e.target)) {
        menu.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', false);
      }
    });
  }

  // Highlight the current page in the nav
  var currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links > li > a').forEach(function (link) {
    var raw = link.getAttribute('href') || '';
    if (raw.indexOf('#') > -1) return;  // in-page anchors (How It Works) aren't pages
    var href = raw.split('#')[0];
    if (href === currentPath || href === currentPath + '.html') link.classList.add('active');
  });

  // Scenario strips loop seamlessly: each row's pills are repeated once (hidden from screen readers)
  document.querySelectorAll('.scenario-row').forEach(function (row) {
    [].slice.call(row.children).forEach(function (pill) {
      var copy = pill.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.classList.add('scenario-dup');
      row.appendChild(copy);
    });
  });

  // Form submit — posts to the hundredx public inquiry API
  var HUNDREDX_API = 'https://100xrecruiting.com';
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var btn = form.querySelector('button[type="submit"]');
      var successEl = form.querySelector('.alert-success');
      var orig = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      var d = Object.fromEntries(new FormData(form));
      var name = ((d.first_name || '') + ' ' + (d.last_name || '')).trim();
      var notes = [
        'Site: LawStaffGroup.net',
        d.i_am            ? 'I am: '              + d.i_am            : '',
        d.candidate_title ? 'Asking about: '      + d.candidate_title : '',
        d.role_title      ? 'Role: '              + d.role_title      : '',
        d.hire_type       ? 'Type: '              + d.hire_type       : '',
        d.need            ? 'Needs: '             + d.need            : '',
        d.engagement      ? 'Temp or permanent: ' + d.engagement      : '',
        d.schedule        ? 'Full / part time: '  + d.schedule        : '',
        d.work_setup      ? 'Work location: '     + d.work_setup      : '',
        d.hours           ? 'Hours / week: '      + d.hours           : '',
        d.practice_area   ? 'Practice area: '     + d.practice_area   : '',
        d.years           ? 'Years of experience: ' + d.years         : '',
        d.location        ? 'Location: '          + d.location        : '',
        d.contact_title   ? 'Title: '             + d.contact_title   : '',
        d.phone           ? 'Phone: '             + d.phone           : '',
        d.message         ? 'Message: '           + d.message         : '',
        d.details         ? 'Details: '           + d.details         : '',
        d.heard_from      ? 'Heard about us: '    + d.heard_from      : '',
      ].filter(Boolean).join('\n');

      try {
        // LAWSTAFF_DOORS_v1: a form with data-endpoint posts to its own 100X door first; if that
        // door isn't there (404 / network), it falls back to the inquiry inbox so nothing is lost.
        var json = null;
        if (form.dataset.endpoint) {
          var direct = await fetch(HUNDREDX_API + form.dataset.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(d),
          }).catch(function () { return null; });
          if (direct && direct.status !== 404 && direct.status !== 405) {
            json = await direct.json().catch(function () { return {}; });
          }
        }
        if (!json) {
          var res = await fetch(HUNDREDX_API + '/api/public/inquiry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employer_name:    name || d.name || '',
              employer_email:   d.email || '',
              employer_company: d.company || '',
              inquiry_type:     form.dataset.form,
              candidate_id:     d.candidate_id || '',
              hp_website:       d.hp_website || '',
              notes:            notes,
            }),
          });
          json = await res.json().catch(function () { return {}; });
        }
        if (json.ok) {
          form.reset();
          if (successEl) successEl.style.display = 'block';
          if (btn) { btn.textContent = 'Sent ✓'; }
        } else {
          throw new Error(json.error || 'server error');
        }
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = orig; }
        alert('Something went wrong — please call 404-250-0790 or email gus@stafffinancial.com.');
      }
    });
  });
})();
