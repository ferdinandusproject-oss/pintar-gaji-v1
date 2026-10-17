/**
 * ============================================================
 * gas-shim.js — Emulasi google.script.run di atas fetch()
 * ------------------------------------------------------------
 * Tujuan file ini SATU-SATUNYA: supaya app.js (asli, tanpa diubah)
 * tetap bisa memanggil seperti:
 *
 *   google.script.run
 *     .withSuccessHandler(cb)
 *     .withFailureHandler(errCb)
 *     .namaFungsi(arg1, arg2, ...)
 *
 * persis seperti di Google Apps Script, padahal di belakang layar
 * setiap panggilan diteruskan sebagai POST ke /api/exec.
 * Tidak ada logika aplikasi di file ini — murni jembatan transport.
 * ============================================================
 */
(function () {
  const ENDPOINT = '/api/exec';

  function callServer(fn, args) {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fn, args })
    }).then(async (res) => {
      let payload;
      try { payload = await res.json(); } catch (e) {
        throw new Error('Respons server tidak valid (' + res.status + ')');
      }
      if (!res.ok) throw new Error(payload && payload.message ? payload.message : 'Permintaan gagal.');
      return payload;
    });
  }

  function makeRunner(successHandler, failureHandler) {
    // Proxy: setiap properti yang diakses (mis. .doLogin) dianggap nama fungsi server,
    // dan ketika dipanggil dengan argumen, diteruskan ke /api/exec.
    return new Proxy({}, {
      get(_target, fnName) {
        if (fnName === 'withSuccessHandler') {
          return (cb) => makeRunner(cb, failureHandler);
        }
        if (fnName === 'withFailureHandler') {
          return (cb) => makeRunner(successHandler, cb);
        }
        if (fnName === 'withUserObject') {
          // Tidak dipakai di app.js ini, disediakan agar API tetap lengkap.
          return () => makeRunner(successHandler, failureHandler);
        }
        return (...args) => {
          callServer(String(fnName), args)
            .then((result) => { if (successHandler) successHandler(result); })
            .catch((err) => { if (failureHandler) failureHandler(err); else console.error(err); });
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = makeRunner(null, null);

  // google.script.host.close() dipakai GAS untuk menutup dialog/sidebar — tidak relevan di web
  // biasa, disediakan sebagai no-op supaya tidak error jika app.js memanggilnya.
  window.google.script.host = window.google.script.host || { close: function () {} };
})();
