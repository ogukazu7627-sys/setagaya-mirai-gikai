import type { Metadata } from "next";
import { Container } from "@/components/layouts/container";
import {
  LegalList,
  LegalPageLayout,
  LegalParagraph,
  LegalSectionTitle,
} from "@/components/layouts/legal-page-layout";
import { SETAGAYA_SITE_DISCLAIMER } from "@/config/site-disclaimer";

export const metadata: Metadata = {
  title: "プライバシーポリシー | みらい議会＠世田谷区",
  description: "みらい議会＠世田谷区のプライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      className="bg-transparent pt-24 md:pt-12"
      title="プライバシーポリシー"
      description="みらい議会＠世田谷区における個人情報の取り扱いについてご説明します。"
    >
      <Container className="space-y-8">
        <p className="text-sm text-mirai-text-muted">
          最終更新日：2026年7月8日
        </p>

        <section className="space-y-4">
          <LegalSectionTitle>1. 個人情報の定義</LegalSectionTitle>
          <LegalParagraph>
            個人情報とは、以下のような情報であって、特定の個人を識別することができるものを指します。
          </LegalParagraph>
          <LegalList
            items={[
              "氏名、年齢、性別、住所、電話番号、職業、メールアドレス",
              "個人ごとに割り当てられたIDやパスワード、その他識別可能な記号",
              "本サービスを通じて取得されるアクセスログ、Cookie、問い合わせ等に含まれる情報",
              "他の情報と容易に照合することができ、それにより特定の個人を識別できることとなるもの",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>2. 個人情報の収集方法と使用範囲</LegalSectionTitle>
          <LegalParagraph>
            個人情報をご提供いただく際には、ユーザーの同意に基づいて行うことを原則とします。また、運営者は、以下に定める目的での利用を除き、個人情報を無断で利用することはありません。
          </LegalParagraph>
          <LegalList
            items={[
              "本サービスの運営およびそれに伴うユーザーとのやりとり・情報提供",
              "本サービスの安全な運営に必要な不正対策",
              "Googleログインを利用した本人確認、AIチャット利用者の識別、利用上限の管理",
              "AIチャットに入力された内容への回答生成、品質改善、不正利用・過剰利用の防止",
              "本サービスの改善・新規開発",
              "上記の各利用目的に必要な各種調査・分析",
              "「3. 第三者への情報提供について」に定める場合における第三者への開示・提供",
            ]}
          />
          <LegalParagraph>
            AIチャットを利用する場合、Googleアカウントから提供されるメールアドレス、プロフィール情報、ユーザーID、チャットに入力された内容、利用日時、利用量、技術的なログを取得することがあります。Gmail送信やGmail下書き作成の権限は、現時点では取得しません。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>3. 第三者への情報提供について</LegalSectionTitle>
          <LegalParagraph>
            以下のいずれかに該当する場合を除き、個人情報を第三者に開示・提供することはありません。
          </LegalParagraph>
          <LegalList
            items={[
              "利用者本人の同意がある場合",
              "統計的なデータなど、個人を特定できない状態で提供する場合",
              "法令に基づく開示請求（裁判所・警察等）があった場合",
              "不正アクセスや規約違反など、緊急の対応が必要と判断された場合",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>4. 安全管理措置</LegalSectionTitle>
          <LegalParagraph>
            個人情報の適切な管理を行うために、責任者を定め、厳正な管理体制を構築しています。AI処理に伴うデータ保管についても、最新のセキュリティ対策を講じます。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>5. Cookie（クッキー）について</LegalSectionTitle>
          <LegalParagraph>
            当ウェブサイトでは、利便性向上とアクセス解析（Googleアナリティクス等）のためにCookieを使用しています。これらは匿名で収集され、個人を特定するものではありません。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>6. 保管期間と廃棄</LegalSectionTitle>
          <LegalParagraph>
            取得した個人情報は、利用目的に照らして必要な期間保管した後、適切な方法で廃棄・削除します。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>7. 改訂と通知</LegalSectionTitle>
          <LegalParagraph>
            本ポリシーは必要に応じて改訂されます。改訂内容はウェブサイトへの掲載をもって効力を生じるものとし、個別の通知は行いません。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>8. お問い合わせ窓口</LegalSectionTitle>
          <LegalParagraph>
            個人情報の確認・修正・削除等のご相談は、本サービスの運営者までご連絡ください。
          </LegalParagraph>
          <LegalList items={[...SETAGAYA_SITE_DISCLAIMER]} />
        </section>
      </Container>
    </LegalPageLayout>
  );
}
