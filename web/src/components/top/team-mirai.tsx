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
            Fork元について
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-[15px] leading-[28px] text-black">
              このサイトは、本家「みらい議会」の公開リポジトリをもとにした世田谷区議会向けの非公式Fork
              MVPです。本サイトは、世田谷区および世田谷区議会の公式サイトではありません。公開されている公式資料をもとに、独自に整理・要約したものです。本サイトは、政党チームみらいが運営するものではありません。
            </p>
          </div>

          {/* ボタングループ */}
          <div className="flex flex-col gap-4">
            <LinkButton
              href="https://gikai.team-mir.ai/"
              icon={{
                src: "/icons/info-icon.svg",
                alt: "",
                width: 23,
                height: 22,
              }}
            >
              本家みらい議会を見る
            </LinkButton>

            <LinkButton
              href="https://www.city.setagaya.lg.jp/gikai/index.html"
              icon={{
                src: "/icons/heart-icon.svg",
                alt: "",
                width: 18,
                height: 17,
              }}
            >
              世田谷区議会公式を見る
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
