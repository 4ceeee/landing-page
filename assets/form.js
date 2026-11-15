/* Alas Digitals · fix cards, copy email and the lead form (shared by / and /start). */
(function () {
  var EMAIL = 'acedolorito@gmail.com';

  /* Fix cards pre-select the form, then scroll to it */
  var needField = document.getElementById('need-field');
  document.querySelectorAll('[data-need]').forEach(function (b) {
    b.addEventListener('click', function () {
      needField.value = b.getAttribute('data-need');
      var c = document.getElementById('contact');
      c.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { needField.focus({ preventScroll: true }); }, 450);
    });
  });

  /* Copy email */
  var copyBtn = document.getElementById('copy-email');
  copyBtn.addEventListener('click', function () {
    function done(ok) { copyBtn.textContent = ok ? 'Copied' : 'Select and copy'; setTimeout(function () { copyBtn.innerHTML = 'Copy<span class="wide"> email</span>'; }, 2200); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(EMAIL).then(function () { done(true); }, function () { done(false); });
    } else { done(false); }
  });

  /* Form (Web3Forms) */
  var form = document.getElementById('lead-form');
  var status = document.getElementById('form-status');
  var btn = document.getElementById('submit-btn');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.className = 'form-status'; status.textContent = '';
    var f = form.elements;
    if (!f.name.value.trim() || !f.email.value.trim() || !f.store.value.trim()) {
      status.className = 'form-status err'; status.textContent = 'Please fill in your name, email and store link.'; return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) {
      status.className = 'form-status err'; status.textContent = 'That email address doesn’t look right. Please check it.'; return;
    }
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch(form.action, { method: 'POST', headers: { 'Accept': 'application/json' }, body: new FormData(form) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j.success, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error('send failed');
        form.reset();
        /* reset() empties the hidden audience field; put the current one back */
        f.path.value = document.body.getAttribute('data-path');
        status.className = 'form-status ok'; status.textContent = 'Thanks. I’ll reply by email.';
      })
      .catch(function () { status.className = 'form-status err'; status.textContent = 'Something went wrong sending that. Please email me at ' + EMAIL + ' instead.'; })
      .then(function () { btn.disabled = false; btn.textContent = 'Send it'; });
  });
})();
