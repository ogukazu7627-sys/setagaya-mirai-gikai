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
            参考にしたプロジェクト
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-[15px] leading-[28px] text-black">
              このサイトは、国会の法案をわかりやすく紹介する「みらい議会」の考え方を参考に、世田谷区議会向けに作っています。世田谷区や世田谷区議会、政党チームみらいが運営する公式サイトではありません。
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
              元になったみらい議会を見る
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
