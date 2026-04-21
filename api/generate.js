export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { categoryLabel, themeHint, keywordHint } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const prompt = `あなたは注文住宅専門のSEOライターです。
YUNO HOMEという住宅会社のブログ記事を書いてください。

【カテゴリ】${categoryLabel}
${themeHint ? `テーマの参考：「${themeHint}」` : ''}
${keywordHint ? `必ずキーワード「${keywordHint}」を含めてください。` : ''}

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
（本文をここに）`;

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
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Groq API error' });
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    const titleMatch = text.match(/^TITLE:\s*(.+)/m);
    const metaMatch = text.match(/^META:\s*(.+)/m);
    const bodyMatch = text.match(/---\n([\s\S]+)/);

    return res.status(200).json({
      title: titleMatch ? titleMatch[1].trim() : '',
      meta: metaMatch ? metaMatch[1].trim() : '',
      body: bodyMatch ? bodyMatch[1].trim() : text
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
