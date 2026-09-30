/* LawStaff Group — legal talent feed.
   Pulls blinded candidate cards (title, location, skills — never a name or
   contact detail) from the public search API and keeps only legal people. */
window.LawStaffTalent = (function () {
  var API = 'https://100xrecruiting.com/api/public/candidates/search';
  var SPOTLIGHT_TITLES = ['paralegal', 'attorney', 'legal assistant', 'counsel', 'litigation', 'legal'];
  var LEGAL = /(paralegal|attorney|lawyer|legal|\bcounsel\b|law clerk|litigation|contracts? (manager|administrator|specialist))/i;
  var NOT_LEGAL = /(counselor|controller|bookkeep|accountant|accounting)/i;
  var US_PLACE = /,\s*[A-Z]{2}$/;
  var PIN = '<svg class="ico" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isLegal(c) {
    var t = c.title || '';
    return LEGAL.test(t) && !NOT_LEGAL.test(t);
  }

  function isUS(c) {
    var loc = (c.location || '').trim();
    return US_PLACE.test(loc) || /^remote$/i.test(loc);
  }

  function fetchPage(param, value, page) {
    var url = API + '?' + param + '=' + encodeURIComponent(value) + '&page=' + (page || 1);
    return fetch(url).then(function (r) { return r.json(); })
      .then(function (d) { return (d && d.ok) ? d : { results: [], pages: 1 }; })
      .catch(function () { return { results: [], pages: 1 }; });
  }

  /* Every page of results for one query (the API returns 12 per page). */
  function fetchAll(param, value) {
    return fetchPage(param, value, 1).then(function (first) {
      var pages = Math.min(first.pages || 1, 10);
      var rest = [];
      for (var p = 2; p <= pages; p++) rest.push(fetchPage(param, value, p));
      return Promise.all(rest).then(function (more) {
        var out = (first.results || []).slice();
        more.forEach(function (m) { out = out.concat(m.results || []); });
        return out;
      });
    });
  }

  function dedupe(list) {
    var seen = {};
    return list.filter(function (c) {
      if (!c || seen[c.id]) return false;
      seen[c.id] = 1;
      return true;
    });
  }

  /* Round-robin across the query groups so the strip mixes titles. */
  function interleave(groups) {
    var out = [], i = 0, more = true;
    while (more) {
      more = false;
      groups.forEach(function (g) { if (i < g.length) { out.push(g[i]); more = true; } });
      i++;
    }
    return out;
  }

  /* All legal candidates across the standard legal titles. */
  function allLegal() {
    return Promise.all(SPOTLIGHT_TITLES.map(function (t) { return fetchAll('title', t); }))
      .then(function (groups) {
        return dedupe(interleave(groups)).filter(function (c) { return isLegal(c) && isUS(c); });
      });
  }

  /* Search by what the visitor typed: title match first, then résumé keywords. */
  function search(q) {
    return Promise.all([fetchAll('title', q), fetchAll('keywords', q)])
      .then(function (groups) {
        return dedupe(groups[0].concat(groups[1])).filter(function (c) { return isLegal(c) && isUS(c); });
      });
  }

  function initials(title) {
    return (title || 'LP').replace(/[^A-Za-z ]/g, ' ').split(' ').filter(Boolean)
      .map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase() || 'LP';
  }

  function card(c) {
    var badges = '';
    if (c.years) badges += '<span class="mpc-badge gold">' + esc(c.years) + ' yrs</span>';
    if (c.availability === 'immediately') badges += '<span class="mpc-badge green">Available now</span>';
    (c.skills || []).slice(0, 3).forEach(function (s) {
      badges += '<span class="mpc-badge">' + esc(String(s).slice(0, 34)) + '</span>';
    });
    var href = 'contact.html?candidate=' + encodeURIComponent(c.id) + '&title=' + encodeURIComponent(c.title || '');
    return '<a class="mpc-card" href="' + href + '">'
      + '<div class="mpc-card-head"><div class="mpc-avatar">' + initials(c.title) + '</div>'
      + '<div><div class="mpc-card-title">' + esc(c.title || 'Legal Professional') + '</div>'
      + '<div class="mpc-card-loc">' + PIN + ' ' + esc(c.location || 'United States') + '</div></div></div>'
      + (badges ? '<div class="mpc-badges">' + badges + '</div>' : '')
      + '<span class="mpc-card-cta">Ask about this candidate →</span></a>';
  }

  return { allLegal: allLegal, search: search, card: card };
})();
