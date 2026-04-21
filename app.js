const CATEGORIES = {
  auto:     'おすすめに従う（自動）',
  madori:   '間取り・設計',
  cost:     '費用・資金計画',
  maker:    'ハウスメーカー・工務店選び',
  life:     '建てた後の暮らし・メンテナンス',
  land:     '土地探し・立地',
  interior: 'インテリア・収納',
  eco:      '省エネ・設備・スマートホーム',
  tips:     '失敗・後悔しないために',
};

async function loadRecommendation() {
  const el = document.getElementById('recommendation-content');
  el.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';

  const today = new Date();
  try {
    const res = await fetch('/api/recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: today.getMonth() + 1, day: today.getDate() })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'サーバーエラー');
    }

    const json = await res.json();
    el.innerHTML = `
      <div class="recommendation-tag">${json.category}</div>
      <div class="recommendation-theme">「${json.theme}」</div>
      <div class="recommendation-reason">📌 ${json.reason}</div>
    `;
    window._recommendation = json;
  } catch (e) {
    el.innerHTML = `<div class="recommendation-reason" style="color:#c0392b">読み込みに失敗しました：${e.message}</div>`;
  }
}

async function createArticle() {
  const categoryVal = document.getElementById('category-select').value;
  const keyword = document.getElementById('keyword-input').value.trim();

  let categoryLabel = (categoryVal === 'auto' && window._recommendation)
    ? window._recommendation.category
    : (CATEGORIES[categoryVal] || '注文住宅全般');

  const themeHint = (categoryVal === 'auto' && window._recommendation)
    ? window._recommendation.theme : '';

  const btn = document.getElementById('create-btn');
  btn.disabled = true;
  btn.classList.add('loading');
  document.getElementById('result-card').classList.add('hidden');

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryLabel, themeHint, keywordHint: keyword })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'サーバーエラー');
    }

    const { titleA, titleB, titleC, meta, body } = await res.json();

    document.getElementById('title-a').textContent = titleA;
    document.getElementById('title-b').textContent = titleB;
    document.getElementById('title-c').textContent = titleC;
    document.getElementById('result-meta-desc').textContent = meta;
    document.getElementById('result-body').textContent = body;

    const now = new Date();
    document.getElementById('result-meta-info').textContent =
      `生成：${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')} | ${categoryLabel}`;

    document.getElementById('result-card').classList.remove('hidden');
    document.getElementById('result-card').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (e) {
    showToast(`エラー：${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}

function copyText(elementId) {
  const text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    const original = btn.textContent;
    btn.textContent = 'コピー済み ✓';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 2000);
  }).catch(() => showToast('コピーに失敗しました', 'error'));
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast${type ? ' ' + type : ''}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('main-screen').classList.remove('hidden');
  loadRecommendation();
});
