export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { month, day } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 512 }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Gemini API error' });
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const json = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
