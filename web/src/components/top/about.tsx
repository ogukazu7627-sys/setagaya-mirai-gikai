import Image from "next/image";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { LinkButton } from "./link-button";

export function About() {
  return (
    <div className="py-10">
      <div className="flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4">
          <h2>
            <Image
              src="/icons/about-typography.svg"
              alt="About"
              width={143}
              height={36}
              priority
            />
          </h2>
          <p className="text-sm font-bold text-primary-accent">
            みらい議会＠世田谷区とは
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-2xl font-bold leading-[43.2px]">
              世田谷区議会での議論を
              <br />
              できる限りわかりやすく
            </h3>
            <p className="text-[15px] leading-[28px] text-black">
              みらい議会＠世田谷区は、世田谷区議会で扱われる議案や質問、請願・陳情、報告事項を、区民が読みやすい形に整理して紹介するサイトです。公式資料に戻れることを大切にしながら、AIも活用して背景や論点を補っています。
            </p>
          </div>

          {/* もっと詳しく知るボタン */}
          <LinkButton
            href={EXTERNAL_LINKS.ABOUT_NOTE}
            icon={{
              src: "/icons/note-icon.png",
              alt: "note",
              width: 25,
              height: 25,
            }}
          >
            みらい議会の考え方を見る
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
