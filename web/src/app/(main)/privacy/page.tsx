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
          最終更新日：2026年7月21日
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
              "問題報告・お問い合わせへの対応、掲載内容や表示不具合の確認・改善",
              "本サービスの改善・新規開発",
              "上記の各利用目的に必要な各種調査・分析",
              "「3. 第三者への情報提供について」に定める場合における第三者への開示・提供",
            ]}
          />
          <LegalParagraph>
            AIチャット・AIインタビューを利用する場合、Googleアカウントから提供されるメールアドレス、プロフィール情報、ユーザーID、チャットやインタビューに入力された内容、利用日時、利用量、技術的なログを取得することがあります。Gmail送信やGmail下書き作成の権限は、現時点では取得しません。
          </LegalParagraph>
          <LegalParagraph>
            問題報告・お問い合わせフォームを利用する場合、入力された本文、任意で入力された氏名・メールアドレス、対象ページURL、対象案件ID、送信時の技術的なログを取得することがあります。
          </LegalParagraph>
          <LegalList
            items={[
              "ユーザーが回答した内容は、本人が明示的に拒否した場合を除き、当ウェブサイトや報告書等で公開される可能性があります。",
              "ユーザーが特定の議員へ意見を伝えることを選択した場合、回答内容やAIが生成したレポートを、運営者が確認した上で当該議員向けの週次レポートに含めることがあります。",
              "Googleアカウントの表示名・メールアドレスは、ユーザーが議員向けレポートへの連絡先共有に明示的に同意した場合に限り、当該レポートに含めます。",
              "統計的利用：取得したデータは、個人を特定できない統計情報に加工した上で、第三者へ公表する場合があります。",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>3. 第三者への情報提供について</LegalSectionTitle>
          <LegalParagraph>
            以下のいずれかに該当する場合を除き、個人情報を第三者に開示・提供することはありません。
          </LegalParagraph>
          <LegalList
            items={[
              "「2. 個人情報の収集方法と使用範囲」に定めるみらい議会AIインタビュー機能を通じて当組織が取得した回答内容の公開",
              "ユーザーが選択した議員に対して、本人の選択と同意の範囲内でAIインタビューレポートを提供する場合",
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
