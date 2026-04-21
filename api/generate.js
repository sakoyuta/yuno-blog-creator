export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { categoryLabel, themeHint, keywordHint } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const prompt = `あなたは住宅業界に10年精通したジャーナリスト兼ライターです。
YUNO HOMEという住宅会社のブログ記事を書いてください。

【YUNO HOMEについて】
性能・デザイン・コスパの全てが高水準な住宅会社。
多くの会社は「デザインが良いと性能が悪い」「性能が良いとデザインが悪い」というトレードオフがあるが、YUNO HOMEはそれを両立している。記事の中に自然な形で1〜2回だけ盛り込む。

【カテゴリ】${categoryLabel}
${themeHint ? `テーマの参考：「${themeHint}」` : ''}
${keywordHint ? `必ずキーワード「${keywordHint}」を含めること。` : ''}

【最重要ルール：絶対に書いてはいけないこと】
- 「〇〇は大切です」「〇〇を考えましょう」などの当たり前の話
- 誰でも知っている一般論・教科書的な内容
- 抽象的で具体性のないアドバイス
- 「〜です。〜です。〜です。」の単調な繰り返し
- 読者が「そんなこと知ってる」と思うような内容

【必ず入れること：読者が「知らなかった！」と思う内容】
- 住宅業界のプロしか知らない裏側の話・業界の慣習
- 「常識だと思われていたが実は違う」という逆説的な事実
- 具体的な数字・データ・比較（例：「実は〇〇%の人が〇〇で失敗している」）
- 建てた後に初めて気づく盲点・見落としがちなポイント
- 「なぜそうなるのか」というメカニズムの解説
- 実際にありがちな失敗談や後悔のエピソード（リアルに）
- 読者が「なるほど、だからか！」と膝を打つような因果関係

【文体・トーン】
- 雑誌・Webメディアのようにテンポよく読めるリズム感
- 短い文と長い文を交互に使いメリハリをつける
- 冒頭は読者の「あるある」な失敗や後悔から入り、引き込む
- 専門用語は使わない。でも表面的でなく深い内容を書く
- 読者への語りかけ（「〜ではないでしょうか」「〜ご存知ですか？」）を適度に使う

【記事の構成】
- 文字数：2,500〜3,500字
- H2見出し：3〜5個（「え、そうなの？」と思わせる引きの強い見出し）
- H3見出し：各H2に2〜3個
- 冒頭200字：読者の失敗談・後悔・驚きの事実から始める
- 最後：「まとめ」セクション（箇条書きで要点整理）
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
