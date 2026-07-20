export const DEFAULT_PETITION_INTERVIEW_CONFIG_NAME =
  "請願下書き用AIインタビュー";

export const DEFAULT_PETITION_INTERVIEW_THEMES = [
  "請願の件名と要旨",
  "請願理由",
  "地域・公益への影響",
  "請願事項",
] as const;

export const DEFAULT_PETITION_INTERVIEW_ESTIMATED_DURATION = 8;

export type DefaultPetitionInterviewQuestion = {
  question: string;
  follow_up_guide: string;
  quick_replies: string[];
  question_order: number;
};

export const DEFAULT_PETITION_INTERVIEW_QUESTIONS = [
  {
    question: "この案件について、区議会や区に一番お願いしたいことは何ですか？",
    follow_up_guide:
      "請願の件名と要旨の核を作るため、制度改善、予算措置、慎重な進行、説明強化など、求めたい方向性を本人の言葉で具体化する。",
    quick_replies: [
      "制度を改善してほしい",
      "予算をつけてほしい",
      "説明を増やしてほしい",
    ],
    question_order: 1,
  },
  {
    question:
      "そうお願いしたい理由や、困っていること・不安に思うことは何ですか？",
    follow_up_guide:
      "請願理由を作るため、個人的な体験、周囲で見聞きしたこと、地域で起きそうな問題を丁寧に引き出す。",
    quick_replies: [
      "生活で困っている",
      "地域で不安がある",
      "周りで聞いたことがある",
    ],
    question_order: 2,
  },
  {
    question:
      "このお願いが実現すると、誰にどんな良い影響がありますか？逆に実現しないと何が心配ですか？",
    follow_up_guide:
      "個人の要望だけでなく、地域全体や公益性のある請願文に整えるため、影響を受ける人、改善されること、放置した場合の心配を整理する。",
    quick_replies: [
      "区民全体に影響がある",
      "特定の人が助かる",
      "実現しないと心配",
    ],
    question_order: 3,
  },
  {
    question:
      "請願事項として、区議会や区に求める具体的な対応を1〜3個に絞るなら何ですか？",
    follow_up_guide:
      "PDFやGoogle Docsに載せる請願事項を箇条書きにするため、対象者拡大、情報提供強化、予算措置、継続審査など具体的な対応へ絞る。",
    quick_replies: [
      "情報提供を強化する",
      "予算措置を検討する",
      "継続審査してほしい",
    ],
    question_order: 4,
  },
] as const satisfies readonly DefaultPetitionInterviewQuestion[];
