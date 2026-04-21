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

function getApiKey() {
  return localStorage.getItem('yuno_gemini_key') || '';
}

function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key || !key.startsWith('AIza')) {
    showToast('正しいAPIキーを入力してください', 'error');
    return;
  }
  localStorage.setItem('yuno_gemini_key', key);
  showMain();
}

function showSettings() {
  const key = getApiKey();
  document.getElementById('api-key-input').value = key;
  document.getElementById('setup-screen').classList.remove('hidden');
  document.getElementById('main-screen').classList.add('hidden');
}

function showMain() {
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('main-screen').classList.remove('hidden');
  loadRecommendation();
}

async function callGemini(prompt) {
  const key = getApiKey();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
      })
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'API エラー');
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function loadRecommendation() {
  const el = document.getElementById('recommendation-content');
  el.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';

  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const prompt = `
あなたは注文住宅専門のSEOブログコンサルタントです。
今日は${month}月${day}日です。

季節感・住宅購入の検討時期・読者の関心タイミングを考慮して、
注文住宅ブログ（施主候補＋家を建てた後の方向け）で
今日書くのに最適な記事テーマを1つ提案してください。

以下のJSON形式のみで返答してください（他の文章は不要）：
{
  "category": "カテゴリ名（例：費用・資金計画）",
  "theme": "具体的な記事テーマ（例：太陽光発電で後悔した人に聞いた本音）",
  "reason": "このテーマをおすすめする理由（40字以内）"
}
`;

  try {
    const text = await callGemini(prompt);
    const json = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    el.innerHTML = `
      <div class="recommendation-tag">${json.category}</div>
      <div class="recommendation-theme">「${json.theme}」</div>
      <div class="recommendation-reason">📌 ${json.reason}</div>
    `;
    window._recommendation = json;
  } catch (e) {
    el.innerHTML = `<div class="recommendation-reason" style="color:#c0392b">読み込みに失敗しました。APIキーを確認してください。</div>`;
  }
}

async function createArticle() {
  const key = getApiKey();
  if (!key) { showToast('APIキーが設定されていません', 'error'); return; }

  const categoryVal = document.getElementById('category-select').value;
  const keyword = document.getElementById('keyword-input').value.trim();

  let categoryLabel = '';
  if (categoryVal === 'auto' && window._recommendation) {
    categoryLabel = window._recommendation.category;
  } else {
    categoryLabel = CATEGORIES[categoryVal] || '注文住宅全般';
  }

  const themeHint = (categoryVal === 'auto' && window._recommendation)
    ? `テーマの参考：「${window._recommendation.theme}」`
    : '';
  const keywordHint = keyword ? `必ずキーワード「${keyword}」を含めてください。` : '';

  const btn = document.getElementById('create-btn');
  btn.disabled = true;
  btn.classList.add('loading');
  document.getElementById('result-card').classList.add('hidden');

  const prompt = `
あなたは注文住宅専門のSEOライターです。
YUNO HOMEという住宅会社のブログ記事を書いてください。

【カテゴリ】${categoryLabel}
${themeHint}
${keywordHint}

【対象読者】
- 注文住宅を検討中の施主候補
- すでに家を建てた方（暮らしや後悔・改善点など）

【記事の条件】
- 文字数：2,500〜3,500字
- 語調：親しみやすく、専門的すぎず、信頼感がある
- 構成：H2見出し3〜5個＋H3見出し複数
- SEOを意識したタイトル（35字以内）
- 冒頭200字以内に読者の悩みへの共感を入れる
- 最後に「まとめ」セクションを入れる
- Markdown形式で出力（# タイトル、## 見出し）

【出力形式（この順番で必ず出力）】
TITLE: （タイトルをここに）
META: （メタディスクリプション120字以内をここに）
---
（本文をここに）
`;

  try {
    const text = await callGemini(prompt);

    const titleMatch = text.match(/^TITLE:\s*(.+)/m);
    const metaMatch = text.match(/^META:\s*(.+)/m);
    const bodyMatch = text.match(/---\n([\s\S]+)/);

    const title = titleMatch ? titleMatch[1].trim() : '（タイトル取得失敗）';
    const meta = metaMatch ? metaMatch[1].trim() : '（メタ取得失敗）';
    const body = bodyMatch ? bodyMatch[1].trim() : text;

    document.getElementById('result-title').textContent = title;
    document.getElementById('result-meta-desc').textContent = meta;
    document.getElementById('result-body').textContent = body;

    const now = new Date();
    document.getElementById('result-meta').textContent =
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
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    showToast('コピーに失敗しました', 'error');
  });
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast${type ? ' ' + type : ''}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// 起動時
window.addEventListener('DOMContentLoaded', () => {
  if (getApiKey()) {
    showMain();
  } else {
    document.getElementById('setup-screen').classList.remove('hidden');
  }
});
