import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { routes } from "@/lib/routes";

export function PublicCommentEventPromotion() {
  return (
    <section className="-mx-6 mt-8 bg-[#e0f2fe] px-6 py-7 sm:-mx-8 sm:px-8">
      <p className="text-center text-sm font-bold text-[#0369a1]">
        世田谷のみらいを語る会
      </p>
      <h2 className="mt-3 text-center text-[22px] font-bold leading-[1.6] text-[#082f49]">
        AIに話したその続きを、
        <br />
        今度は人と話してみませんか。
      </h2>
      <p className="mt-3 text-center text-sm font-bold leading-6 text-[#075985]">
        若い世代が主催。どの世代の方も歓迎します。
      </p>
      <p className="mt-5 text-sm leading-6 text-[#0c4a6e]">
        インタビューで考えたことを、地域の人たちと話してみる対話の場です。専門知識や、まとまった意見は必要ありません。話を聞くことを中心にした参加も歓迎します。
      </p>
      <dl className="mt-5 border-y border-sky-200 py-4 text-sm leading-6 text-[#082f49]">
        <div>
          <dt className="font-bold">日時</dt>
          <dd>2026年10月3日（土）14:00〜16:00</dd>
        </div>
        <div className="mt-3">
          <dt className="font-bold">会場</dt>
          <dd>太子堂区民センター 第二会議室</dd>
          <dd>東京都世田谷区太子堂1丁目14番20号</dd>
          <dd>三軒茶屋駅から徒歩約5分</dd>
        </div>
        <div className="mt-3">
          <dt className="font-bold">参加費</dt>
          <dd>無料</dd>
        </div>
      </dl>
      <Link
        href={routes.youthDialogueEvent()}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0ea5e9] px-6 text-[15px] font-bold text-white transition-colors hover:bg-[#0284c7]"
      >
        イベントの詳細・参加申込
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
