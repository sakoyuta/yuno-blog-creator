export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { categoryLabel, themeHint, keywordHint } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const prompt = `あなたは住宅専門の雑誌ライターです。
YUNO HOMEという住宅会社のブログ記事を書いてください。

【YUNO HOMEについて】
性能・デザイン・コスパの全てが高水準な住宅会社。
多くの会社は「デザインが良いと性能が悪い」「性能が良いとデザインが悪い」というトレードオフがあるが、YUNO HOMEはそれを両立している。記事の中に自然な形で1〜2回盛り込む。

【カテゴリ】${categoryLabel}
${themeHint ? `テーマの参考：「${themeHint}」` : ''}
${keywordHint ? `必ずキーワード「${keywordHint}」を含めること。` : ''}

【対象読者】
- 注文住宅を真剣に検討中の方
- すでに家を建てた方（暮らし・後悔・改善点）

【文体・トーン】
- 雑誌のようにテンポよく、リズム感がある
- 短い文を重ねてスピード感を出す
- 読者の「あるある」な悩みや失敗談から入る
- 専門用語は使わない。でも信頼感がある
- 具体的な数字・エピソード・比較を積極的に使う
- 「〜です。〜です。〜です。」の繰り返しは絶対NG
- 読者が「へぇ！」「わかる！」と思えるポイントを入れる

【記事の構成】
- 文字数：2,500〜3,500字
- H2見出し：3〜5個（読者が思わず読みたくなるタイトルに）
- H3見出し：各H2に2〜3個
- 冒頭：読者の悩みへの共感から始める（200字以内）
- 最後：「まとめ」セクション
- Markdown形式（## 見出し、### 小見出し）

【出力形式（必ずこの順番・この形式で出力すること）】
TITLE_A: （よくある系：検索されやすいオーソドックスなタイトル・35字以内）
TITLE_B: （煽り系：読者がドキッとする・好奇心を刺激するタイトル・35字以内）
TITLE_C: （プッシュ系：読者の背中を押す・行動を促すタイトル・35字以内）
META: （メタディスクリプション・120字以内）
---
（本文をここに・本文の中にTITLEやMETAは書かない）`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.85
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Groq API error' });
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    const titleAMatch = text.match(/^TITLE_A:\s*(.+)/m);
    const titleBMatch = text.match(/^TITLE_B:\s*(.+)/m);
    const titleCMatch = text.match(/^TITLE_C:\s*(.+)/m);
    const metaMatch   = text.match(/^META:\s*(.+)/m);
    const bodyMatch   = text.match(/---\n([\s\S]+)/);

    return res.status(200).json({
      titleA: titleAMatch ? titleAMatch[1].trim() : '',
      titleB: titleBMatch ? titleBMatch[1].trim() : '',
      titleC: titleCMatch ? titleCMatch[1].trim() : '',
      meta:   metaMatch   ? metaMatch[1].trim()   : '',
      body:   bodyMatch   ? bodyMatch[1].trim()   : text
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
