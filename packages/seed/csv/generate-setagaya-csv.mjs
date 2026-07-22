import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");

const SESSION_ID = deterministicUuid("setagaya-session-2025-04");
const SESSION_NAME = "令和7年第4回区議会定例会";
const SESSION_SLUG = "setagaya-2025-04";
const CREATED_AT = "2026-07-05 00:00:00+09";

const TAG_DESCRIPTIONS = {
  会計: "区の会計、歳入歳出、決算処理に関する案件",
  文教常任委員会: "文教常任委員会で扱われる教育・文化・子ども関連の案件",
  学校事務: "学校現場の事務、校務、教育委員会の運用に関する案件",
  いじめ: "学校でのいじめ防止、相談、対応体制に関する案件",
  学校: "区立学校、教育環境、学校運営に関する案件",
  不登校支援: "不登校や登校しづらい児童・生徒への支援に関する案件",
  北沢学園中: "北沢学園中学校の教育環境に関する案件",
  一般質問: "区議会本会議での議員質問に関する案件",
};

const SAMPLE_ITEMS = [
  {
    key: "2025-04-bill-174-school-lunch-accounting",
    item_type: "bill",
    major_category: "教育🏫",
    title: "議案第174号 世田谷区学校給食費会計条例を廃止する条例",
    status: "enacted",
    status_label: "可決",
    status_note: "2025-12-05 全員賛成で可決（文教常任委員会）",
    submitted_date: "2025-11-26 00:00:00+09",
    sources: [
      { title: "議案PDF", source_type: "bill_pdf" },
      {
        title: "文教常任委員会審査予定案件（12月1日開催）",
        source_type: "committee_agenda",
        published_at: "2025-12-01",
      },
      {
        title: "令和7年第4回区議会定例会の結果",
        source_type: "session_result",
      },
      { title: "議決内容", source_type: "session_result" },
      { title: "議案賛否一覧表", source_type: "vote_result" },
    ],
    tags: ["会計"],
    summary:
      "学校給食費の無償化に伴い、学校給食費を特別会計として管理する必要がなくなったため、世田谷区学校給食費会計条例を廃止する議案です。",
    content: `# この案件のポイント

- 学校給食費の無償化に伴い、学校給食費会計条例を廃止する
- 令和8年4月1日から施行される
- 令和7年度分の歳入・歳出・決算は従前どおり処理される
- 廃止会計に属する債権債務や歳計剰余金は、一般会計が引き継ぐ

# この案件が出てきた背景

世田谷区では学校給食費の無償化が進められたことで、学校給食費だけを特別会計として管理する必要がなくなりました。そのため、学校給食費会計条例を廃止する議案が提出されました。

# 関係する人・地域

- 世田谷区立小中学校の児童・生徒
- 保護者
- 学校給食の運営に関わる学校・教育委員会
- 区の財政・会計部門
- 区内全域

# 主な論点

## 会計の透明性は保たれるか

特別会計を廃止した後も、学校給食に関する支出が一般会計の中で分かりやすく確認できるかがポイントです。

## 給食費無償化の財源は持続可能か

条例廃止そのものだけでなく、無償化を続けるための財源の安定性も確認する必要があります。

# よくある質問

## Q. 学校給食費が有料に戻るということですか？

A. いいえ。学校給食費の無償化に伴い、給食費会計を廃止するという内容です。

## Q. いつから変わりますか？

A. 令和8年4月1日から施行されます。

## Q. 保護者が手続きする必要はありますか？

A. 条例廃止そのものについて、通常は保護者側の手続きは想定されません。

# 関連リンク

- 議案PDF
- 文教常任委員会審査予定案件
- 令和7年第4回定例会 議決内容
- 令和7年第4回定例会 賛否一覧`,
  },
  {
    key: "2025-04-report-school-collection-workload",
    item_type: "report",
    major_category: "教育🏫",
    title:
      "学校徴収金事務の負担軽減に向けた取組みの実施状況及び全校実施について",
    status: "in_originating_house",
    status_label: "委員会で報告",
    status_note: "2025-12-01 文教常任委員会で報告",
    submitted_date: "2025-12-01 00:00:00+09",
    sources: [
      {
        title: "文教常任委員会審査予定案件（12月1日開催）",
        source_type: "committee_agenda",
        published_at: "2025-12-01",
      },
    ],
    tags: ["学校事務", "文教常任委員会"],
    summary:
      "学校で扱う徴収金事務について、教職員や保護者の負担軽減に向けた取組みの実施状況と、全校実施に向けた方針が文教常任委員会で報告された案件です。",
    content: `# この報告のポイント

- 学校徴収金事務の負担軽減に向けた取組みについて報告された
- 文教常任委員会で令和7年12月1日に扱われた
- 今後、全校実施に向けた対応が進む可能性がある

# この報告が出てきた背景

学校現場では、教材費などの徴収金に関する事務が教職員や保護者の負担になることがあります。その負担を軽減するため、区としての取組み状況が報告されました。

# 関係する人・地域

- 区立小中学校の教職員
- 保護者
- 児童・生徒
- 教育委員会
- 区内全域

# 主な論点

## 教職員の負担は本当に減るのか

制度やシステムを導入しても、現場の事務負担がどこまで軽くなるかが重要です。

## 保護者にとって分かりやすい仕組みになるか

支払い方法や案内が分かりやすくなるか、保護者側の負担が増えないかが確認ポイントです。

# よくある質問

## Q. これは議会で採決されたものですか？

A. いいえ。これは文教常任委員会での報告事項であり、議案のように可決・否決するものではありません。

## Q. 今後も追うべきですか？

A. はい。全校実施に向けた報告や予算措置が今後出てくる可能性があります。`,
  },
  {
    key: "2025-04-petition-stop-bullying",
    item_type: "petition",
    major_category: "教育🏫",
    title:
      "世田谷区内の小・中学校における「いじめ」をなくす取り組みに関する陳情",
    status: "in_originating_house",
    status_label: "文教常任委員会に付託",
    status_note: "2025-12-05 文教常任委員会に付託",
    submitted_date: "2025-12-05 00:00:00+09",
    sources: [
      {
        title: "令和7年第4回区議会定例会 請願",
        source_type: "petition_result",
      },
    ],
    tags: ["いじめ", "学校"],
    summary:
      "区民から提出された、世田谷区内の小・中学校におけるいじめをなくす取り組みに関する陳情です。令和7年第4回定例会で文教常任委員会に付託されました。",
    content: `# この陳情のポイント

- 区民から「いじめ」をなくす取り組みに関する陳情が出された
- 文教常任委員会に付託された
- 今後、委員会で審査される

# この陳情が出てきた背景

学校でのいじめは、児童・生徒の安全や学びの環境に直結する重要な課題です。区民が議会に対して、区立小中学校でのいじめ対策を正式に扱うよう求めたものと考えられます。

# 関係する人・地域

- 区立小中学校の児童・生徒
- 保護者
- 学校
- 教育委員会
- 文教常任委員会
- 区内全域

# 主な論点

## 区としてどこまで実態を把握しているか

いじめの件数だけでなく、相談体制や対応の質が問われます。

## 学校任せにせず、区全体で対応できるか

学校現場だけでなく、教育委員会、地域、保護者との連携が重要です。

## 採択・不採択・継続審議のどれになるか

陳情は提出されて終わりではなく、委員会でどう扱われるかを追う必要があります。

# よくある質問

## Q. 陳情とは何ですか？

A. 区民や団体が、区議会に対して特定の要望を正式に提出する制度です。紹介議員が必要な請願と違い、陳情は紹介議員なしでも出せます。

## Q. 付託とは何ですか？

A. 本会議で、詳しく審査するために担当委員会へ送ることです。`,
  },
  {
    key: "2025-04-question-kitazawa-gakuen",
    item_type: "question",
    major_category: "教育🏫",
    title: "北沢学園中の教育環境の整備",
    status: "enacted",
    status_label: "本会議で質問・答弁済み",
    status_note:
      "2025-11-26または2025-11-27 本会議で福田たえ美議員が質問",
    submitted_date: "2025-11-26 00:00:00+09",
    sources: [
      {
        title: "令和7年第4回区議会定例会 代表質問",
        source_type: "question_summary",
      },
    ],
    tags: ["不登校支援", "北沢学園中"],
    summary:
      "不登校などの生徒が通う本校型の学びの多様化学校として開設される北沢学園中学校について、教員が子どもたちと十分に向き合える体制や、生徒の意欲を引き出す学習環境の整備を求めた質問です。",
    content: `# この質問のポイント

- 北沢学園中学校の教育環境整備について質問された
- 不登校などの生徒が安心して学べる体制が問われた
- 区側は、多様な学びを実施し、生徒の意欲を引き出せるよう取り組むと答弁した

# この質問が出てきた背景

世田谷区では、不登校などの生徒が通う本校型の学びの多様化学校の開設が進められています。新しい学校ができるだけでなく、子どもたちに合った教育環境をどう整えるかが重要な課題です。

# 関係する人・地域

- 不登校傾向のある生徒
- 保護者
- 教職員
- 北沢地域
- 教育委員会

# 主な論点

## 教員体制は十分か

少人数や個別支援が必要な生徒に対して、教員が十分に向き合える体制になっているか。

## 多様な学びをどう実現するか

通常の学校と異なる学び方を、どのように制度・カリキュラム・空間設計に反映するか。

## 開校後の検証をどう行うか

開設して終わりではなく、生徒の出席状況、学習意欲、保護者の声などをどう確認するか。

# よくある質問

## Q. これは議案ですか？

A. いいえ。これは議員が本会議で行った質問です。可決・否決されるものではありません。

## Q. 質問カードでは何を見るべきですか？

A. 議員が何を問題視し、区がどう答えたか、その後の施策にどうつながったかを見るのが重要です。`,
  },
];

function deterministicUuid(input) {
  const hash = crypto.createHash("sha1").update(input).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function csvEscape(value) {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function writeCsv(fileName, headers, rows) {
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ];
  fs.writeFileSync(path.join(dataDir, fileName), `${lines.join("\n")}\n`);
}

function stringifySources(sources) {
  return JSON.stringify(sources ?? []);
}

function main() {
  const tagMajorCategoryByLabel = new Map();
  for (const item of SAMPLE_ITEMS) {
    for (const label of item.tags) {
      tagMajorCategoryByLabel.set(label, item.major_category);
    }
  }

  const tagLabels = [...new Set(SAMPLE_ITEMS.flatMap((item) => item.tags))];
  const tagRows = tagLabels.map((label, index) => ({
    id: deterministicUuid(`setagaya-tag-${label}`),
    label,
    major_category: tagMajorCategoryByLabel.get(label) ?? "暮らし🙋",
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    featured_priority: index + 1,
    description: TAG_DESCRIPTIONS[label] ?? `${label}に関する世田谷区議会の案件`,
  }));

  const billRows = SAMPLE_ITEMS.map((item) => ({
    id: deterministicUuid(`setagaya-sample-${item.key}`),
    name: item.title,
    item_type: item.item_type,
    major_category: item.major_category,
    originating_house: "HR",
    status: item.status,
    status_label: item.status_label,
    status_note: item.status_note,
    submitted_date: item.submitted_date,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    thumbnail_url: "",
    publish_status: "published",
    is_featured: "false",
    share_thumbnail_url: "",
    shugiin_url: "",
    diet_session_id: SESSION_ID,
    sources: stringifySources(item.sources),
    knowledge_source: `${item.summary}\n\n${item.content}`,
    use_knowledge_source_in_chat: "true",
    interview_enabled: "false",
  }));

  const contentRows = SAMPLE_ITEMS.flatMap((item) => {
    const billId = deterministicUuid(`setagaya-sample-${item.key}`);
    return ["normal", "hard"].map((difficultyLevel) => ({
      id: deterministicUuid(
        `setagaya-sample-content-${item.key}-${difficultyLevel}`
      ),
      bill_id: billId,
      difficulty_level: difficultyLevel,
      title: item.title,
      summary: item.summary,
      content: item.content,
      created_at: CREATED_AT,
      updated_at: CREATED_AT,
    }));
  });

  const billTagRows = SAMPLE_ITEMS.flatMap((item) =>
    item.tags.map((label) => ({
      bill_id: deterministicUuid(`setagaya-sample-${item.key}`),
      tag_id: deterministicUuid(`setagaya-tag-${label}`),
      created_at: CREATED_AT,
    }))
  );

  writeCsv("diet_sessions_rows.csv", [
    "id",
    "name",
    "start_date",
    "end_date",
    "created_at",
    "updated_at",
    "slug",
    "shugiin_url",
    "is_active",
  ], [
    {
      id: SESSION_ID,
      name: SESSION_NAME,
      start_date: "2025-11-26",
      end_date: "2025-12-05",
      created_at: CREATED_AT,
      updated_at: CREATED_AT,
      slug: SESSION_SLUG,
      shugiin_url: "",
      is_active: "true",
    },
  ]);

  writeCsv("tags_rows.csv", [
    "id",
    "label",
    "major_category",
    "created_at",
    "updated_at",
    "featured_priority",
    "description",
  ], tagRows);

  writeCsv("bills_rows.csv", [
    "id",
    "name",
    "item_type",
    "major_category",
    "originating_house",
    "status",
    "status_label",
    "status_note",
    "submitted_date",
    "created_at",
    "updated_at",
    "thumbnail_url",
    "publish_status",
    "is_featured",
    "share_thumbnail_url",
    "shugiin_url",
    "diet_session_id",
    "sources",
    "knowledge_source",
    "use_knowledge_source_in_chat",
    "interview_enabled",
  ], billRows);

  writeCsv("bill_contents_rows.csv", [
    "id",
    "bill_id",
    "difficulty_level",
    "title",
    "summary",
    "content",
    "created_at",
    "updated_at",
  ], contentRows);

  writeCsv("bills_tags_rows.csv", ["bill_id", "tag_id", "created_at"], billTagRows);
  writeCsv("interview_configs_rows.csv", [
    "id",
    "bill_id",
    "name",
    "status",
    "themes",
    "created_at",
    "updated_at",
  ], []);
  writeCsv("interview_questions_rows.csv", [
    "id",
    "interview_config_id",
    "question",
    "follow_up_guide",
    "quick_replies",
    "question_order",
    "created_at",
    "updated_at",
  ], []);

  console.log(
    `Generated Setagaya CSV seed from ${SAMPLE_ITEMS.length} sample items.`
  );
}

main();
