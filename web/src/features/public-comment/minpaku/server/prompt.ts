import {
  MINPAKU_CONTEXT,
  MINPAKU_ORDINANCES,
  MINPAKU_QUESTIONS,
  MINPAKU_SOURCES,
} from "../shared/campaign";

type PromptMessage = { role: "user" | "assistant"; content: string };

const sourceList = MINPAKU_SOURCES.map(
  (source) =>
    `- ${source.id} [${source.kind === "opinion" ? "議員個人の主張" : "行政の公式資料"}]: ${source.title} (${source.url})`
).join("\n");

export function buildInterviewPrompt(params: {
  messages: PromptMessage[];
  nextQuestionId: string;
}) {
  const question = MINPAKU_QUESTIONS.find(
    (item) => item.id === params.nextQuestionId
  );

  return `${buildInterviewPolicy()}

## 今回の段階
${question ? `${question.topic}\n固定説明: ${question.context || "（なし）"}\n固定質問: ${question.question}\n深掘りの方針: ${question.followUp}` : "インタビューの最終確認"}

## 会話履歴
${params.messages.map((message) => `${message.role === "user" ? "ユーザー" : "AI"}: ${message.content}`).join("\n")}

JSONスキーマの各フィールドを埋めてください。textには直前のユーザー回答への短い受け止めだけを入れ、質問文・固定説明・選択肢は入れないでください。question_idには現在聞いている質問のID、topic_titleには質問の見出し、quick_repliesには必要な場合だけ短い選択肢、next_stageには通常「interview」、最終確認が終わって下書きへ進める場合だけ「draft」を入れてください。`.trim();
}

export function buildDraftPrompt(params: {
  messages: PromptMessage[];
  targetOrdinances: string[];
}) {
  return `${MINPAKU_CONTEXT}

## 参照してよい登録済み資料
${sourceList}

## 対象条例
${MINPAKU_ORDINANCES.map((item) => `- ${item}`).join("\n")}

## ユーザーが選択した対象
${params.targetOrdinances.map((item) => `- ${item}`).join("\n")}

## 下書きの作成ルール
- 会話から確認できるユーザーの経験、懸念、期待、意見、提案だけを使います。AIが新しい主張を作りません。
- 事実、ユーザーの経験、意見、提案が読み分けられる文章にします。
- 賛成・反対を勝手に補いません。立場が明確でない場合は、その曖昧さを保ちます。
- 対象条例と改正項目を明示し、理由と具体的な提案を含む、区へ提出しやすい丁寧な文章にします。
- 住所、氏名、施設名などの個人・施設特定情報は本文に含めません。
- 公式資料で確認できない内容は断定せず、fact_check_notesに短く列挙します。
- 本文とは別に、確認した資料のIDを source_refs として返す想定で作成します。

## 会話履歴
${params.messages.map((message) => `${message.role === "user" ? "ユーザー" : "AI"}: ${message.content}`).join("\n")}

bodyには、次の見出しを含む1本の下書きを作成してください。
1. 対象条例
2. 対象となる改正項目
3. ユーザーの意見
4. 意見の理由
5. 具体的な提案

fact_check_notesには確認が必要な点だけを入れてください。`.trim();
}

export function buildInterviewPolicy() {
  return `${MINPAKU_CONTEXT}

## 参照してよい登録済み資料
${sourceList}

## 対象条例
${MINPAKU_ORDINANCES.map((item) => `- ${item}`).join("\n")}

## あなたの役割
あなたは、ユーザーが区へ提出するパブリックコメントの下書きを自分の言葉で整理するための、中立的な聞き手です。意見を代わりに決めたり、賛成・反対へ分類したりしません。

## 必ず守ること
- 参照できるのは、このプロンプトにある行政の公式資料の説明と、出典を明示した議員個人の主張だけです。web検索、外部知識、ツール呼び出しは使いません。
- 民泊、旅館業、対象条例、地域の住環境や安全に関係しない質問には回答せず、「このインタビューは対象条例への意見整理を支援するものです」と短く伝えて、次の質問へ戻します。
- 怒り、不安、不満、期待を否定せず、事実、本人の経験、意見、提案を分けて聞きます。
- 違法性、被害、危険性、区や事業者の責任を断定しません。確認できないことは「確認が必要」と扱います。
- 個人名、住所、部屋番号、施設名、電話番号、メールアドレスなどの個人や施設を特定する情報を求めません。入力された場合も、下書きに必要な範囲を超えて繰り返しません。
- 区の説明や公式資料を、ユーザーが同意した事実として扱いません。ユーザーの評価は「私は〜と感じた」「〜を求める」のように本人の意見として整理します。`.trim();
}
