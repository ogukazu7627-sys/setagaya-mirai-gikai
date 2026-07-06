import Image from "next/image";

export function Hero() {
  return (
    <div className="relative w-full aspect-[402/670] md:aspect-auto md:h-[70vh] md:min-h-[400px]">
      <Image
        src="/img/hero_background.jpg"
        alt="みらい議会"
        fill
        priority
        className="hidden object-cover object-center md:block"
        sizes="(min-width: 768px) 100vw, 0vw"
        quality={85}
      />
      <Image
        src="/img/hero_background_mobile.jpg"
        alt="みらい議会"
        fill
        priority
        className="object-cover object-top md:hidden"
        sizes="(max-width: 767px) 100vw, 0vw"
        quality={85}
      />
      <div className="sr-only">
        <h1>みらい議会＠世田谷区</h1>
        <p>いま世田谷区議会で話されていることをやさしい言葉で説明します。</p>
      </div>

      {/* スクロールインジケーター */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce-gentle">
        <div className="w-[1px] h-[34px] bg-black"></div>
        <p className="mt-2 font-lexend text-[10px] leading-[20px] text-black">
          Scroll
        </p>
      </div>
    </div>
  );
}
