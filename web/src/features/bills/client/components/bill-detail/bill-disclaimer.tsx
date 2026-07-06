import { LinkButton } from "@/components/top/link-button";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { SETAGAYA_SITE_DISCLAIMER } from "@/config/site-disclaimer";

export function BillDisclaimer() {
  return (
    <div className="space-y-6 pt-4 pb-10">
      {/* データの出典について */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-black">掲載コンテンツについて</h3>
        <p className="text-xs leading-relaxed text-mirai-text-note">
          掲載されている議案情報は、世田谷区公式サイトの議案PDF、議案一覧、審議案件・審議結果等の公開情報を基に、AIを活用しながら背景情報を整理したものです。
        </p>
      </div>

      {/* 掲載コンテンツについての免責事項 */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-black">免責事項</h3>
        <div className="space-y-1 text-xs leading-relaxed text-mirai-text-note">
          {SETAGAYA_SITE_DISCLAIMER.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>

      <LinkButton
        href={EXTERNAL_LINKS.FAQ}
        icon={{
          src: "/icons/question-bubble.svg",
          alt: "note",
          width: 22,
          height: 22,
        }}
      >
        よくある質問
      </LinkButton>
    </div>
  );
}
