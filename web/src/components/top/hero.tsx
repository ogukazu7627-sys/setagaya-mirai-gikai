import Image from "next/image";

export function Hero() {
  return (
    <div className="pt-28 md:pt-0">
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-[#e0f2fe]">
        <Image
          src="/img/hero_background.jpg"
          alt="みらい議会"
          fill
          priority
          className="object-contain object-center"
          sizes="100vw"
          quality={85}
        />
        <div className="sr-only">
          <h1>みらい議会＠世田谷区</h1>
          <p>
            いま世田谷区議会で話されていることをやさしい言葉で説明します。
          </p>
        </div>

        {/* スクロールインジケーター */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce-gentle md:bottom-8">
          <div className="w-[1px] h-[34px] bg-black"></div>
          <p className="mt-2 font-lexend text-[10px] leading-[20px] text-black">
            Scroll
          </p>
        </div>
      </div>
    </div>
  );
}
