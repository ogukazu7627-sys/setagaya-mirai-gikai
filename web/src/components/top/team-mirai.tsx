import { EXTERNAL_LINKS } from "@/config/external-links";
import { LinkButton } from "./link-button";

export function TeamMirai() {
  return (
    <div className="py-10">
      <div className="flex flex-col gap-6">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4">
          <h2 className="font-lexend font-bold text-[32px] leading-none text-primary-accent">
            みらい議会
          </h2>
          <p className="text-sm font-bold text-primary-accent">
            チームみらいが公開している元プロジェクト
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-[15px] leading-[28px] text-black">
              このサイトは、チームみらいが国会の法案をわかりやすく紹介するために公開している「みらい議会」をもとに、世田谷区議会向けに作っています。仕組みや考え方は参考にしつつ、掲載内容と運営は世田谷区版として独自に整理しています。
            </p>
            <p className="text-[15px] leading-[28px] text-black">
              世田谷区公認のサイトではなく、世田谷区議会または政党チームみらいが運営するものでもありません。
            </p>
          </div>

          {/* ボタングループ */}
          <div className="flex flex-col gap-4">
            <LinkButton
              href={EXTERNAL_LINKS.ORIGINAL_MIRAI_GIKAI}
              icon={{
                src: "/icons/info-icon.svg",
                alt: "",
                width: 23,
                height: 22,
              }}
            >
              みらい議会
            </LinkButton>

            <LinkButton
              href={EXTERNAL_LINKS.ABOUT_NOTE}
              icon={{
                src: "/icons/note-icon.png",
                alt: "note",
                width: 25,
                height: 25,
              }}
            >
              みらい議会の考え方
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
