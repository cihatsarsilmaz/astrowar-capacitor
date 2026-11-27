// Offline, read-only presentation of operation time. No network, secrets or writes.
export function remainingSeconds(startMs, nowMs, durationSeconds) {
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs) || nowMs < startMs) {
    throw new Error('Geçersiz başlangıç veya sistem zamanı');
  }
  return Math.max(0, durationSeconds - Math.floor((nowMs - startMs) / 1000));
}

export function parseStart(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error('Saat dilimli ISO 8601 zamanı gerekli');
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const hour = Number(value.slice(11, 13));
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year === 0 || !(day >= 1 && day <= daysInMonth[month - 1]) || hour >= 24) {
    throw new Error('Geçersiz tarih');
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error('Geçersiz tarih');
  return parsed;
}

export function formatRemaining(seconds) {
  const m = Math.floor(seconds / 60);
  return String(m).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
}

export function timerView(startMs, nowMs, stopped = false) {
  const wait = remainingSeconds(startMs, nowMs, 600);
  const review = remainingSeconds(startMs, nowMs, 900);
  return {
    wait: formatRemaining(wait),
    review: formatRemaining(review),
    state: stopped ? 'STOPPED (yalnızca yerel görünüm)' :
      review === 0 ? 'DENETİM ZAMANI GELDİ — otomatik onay yok' :
      wait === 0 ? 'BEKLEME TAMAMLANDI — denetim bekleniyor' :
      'BEKLEME SÜRÜYOR',
    automaticApproval: false,
    mergePermitted: false,
    deployPermitted: false
  };
}

if (typeof document !== 'undefined') {
  const input = document.getElementById('started');
  const stop = document.getElementById('stop');
  const status = document.getElementById('status');
  const wait = document.getElementById('wait');
  const review = document.getElementById('review');
  let startMs = null;
  function render() {
    if (startMs === null) return;
    try {
      const state = timerView(startMs, Date.now(), stop.checked);
      wait.textContent = state.wait;
      review.textContent = state.review;
      status.textContent = state.state;
    } catch (error) {
      status.textContent = error.message;
      wait.textContent = '--:--';
      review.textContent = '--:--';
    }
  }
  document.getElementById('apply').addEventListener('click', () => {
    try {
      startMs = parseStart(input.value.trim());
      render();
    } catch (error) {
      startMs = null;
      status.textContent = error.message;
      wait.textContent = '--:--';
      review.textContent = '--:--';
    }
  });
  stop.addEventListener('change', render);
  setInterval(render, 1000);
}
