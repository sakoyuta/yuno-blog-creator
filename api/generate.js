export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { categoryLabel, themeHint, keywordHint } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const prompt = `あなたは注文住宅を建てた経験を持つ住宅ブロガーであり、インテリアコーディネーターでもあります。
読者は「インスタやTikTokで情報収集している施主・施主候補」です。

SNSが普及した今、「LED照明を使いましょう」「収納を考えましょう」レベルの情報は誰でも知っています。
このブログが読まれるためには、SNSでは拾いきれない「深くて具体的な情報」が必要です。

【カテゴリ】${categoryLabel}
${themeHint ? `テーマの参考：「${themeHint}」` : ''}
${keywordHint ? `必ずキーワード「${keywordHint}」を含めること。` : ''}

【絶対禁止：書いてはいけないこと】
- 「〇〇は大切です」「〇〇を心がけましょう」などの当たり前の話
- 誰でも知っている一般論・抽象的なアドバイス
- 「環境のために〇〇しましょう」「専門家に相談しましょう」的な締め方
- YUNO HOMEの宣伝（記事全体を通じて一切触れない。あくまで施主目線の情報発信）
- 読者が「そんなこと知ってる」「フーン」で終わる内容

【必須：読者が「試したい！」「知らなかった！」と思う内容】
具体例のレベル感（このくらい具体的に書く）：
- 「ニトリの収納ボックスと3コインズの仕切りを組み合わせると、910モジュール住宅の有効幅780mmにシンデレラフィットする」
- 「死角を利用して扉をなくすと、その壁面に収納が作れて実質0円で収納量が増える」
- 「吹き抜けのある家はC値1.0以下じゃないと夏の冷房費が月1万円以上跳ね上がる」
- 「窓の位置を南側に集中させると、冬は暖かいが夏の西日で後悔する人が続出」

こういった「やった人だけが気づく」「プロが知っている」情報を書く。
具体的な数値・サイズ・製品名・価格・実体験エピソードを積極的に使う。
「なぜそうなるのか」のメカニズムまで踏み込む。
読者が読み終えたあと「早速やってみよう」「家族に教えたい」と思わせる。

【文体・トーン】
- インスタやTikTokより深い情報を、テンポよく読めるリズムで書く
- 短い文でテンポを作り、ときどき長い文で深掘りする
- 冒頭は「あるある失敗談」や「意外な事実」から入って引き込む
- 語りかけるように書く（「〜ではないですか？」「実はこれ、落とし穴なんです」）
- 難しい専門用語は使わない。でも内容は深く、具体的に

【記事の構成】
- 文字数：2,500〜3,500字
- H2見出し：3〜5個（読者が「え、なんで？」と思わず読みたくなる見出し）
- H3見出し：各H2に2〜3個
- 冒頭：驚きの事実か失敗談からスタート（200字以内）
- 最後：「まとめ」（箇条書きで要点を整理）
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
