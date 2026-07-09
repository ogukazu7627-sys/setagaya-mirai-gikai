export function BillDisclaimer() {
  return (
    <div className="space-y-4 pt-4 pb-10">
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-black">掲載コンテンツについて</h3>
        <div className="space-y-2 text-xs leading-relaxed text-mirai-text-note">
          <p>
            掲載している議案情報は、世田谷区・世田谷区議会が公開している議案PDF、議案一覧、審議案件・審議結果などをもとに、独自に整理・要約したものです。
          </p>
          <p>
            AIによる要約・解説を含むため、誤りや更新遅れが残る可能性があります。正確な情報は、必ず世田谷区・世田谷区議会の公式資料でご確認ください。
          </p>
          <p>
            本サイトは、世田谷区および世田谷区議会の公式サイトではありません。政党チームみらいが運営するものでもありません。
          </p>
        </div>
      </div>
    </div>
  );
}
