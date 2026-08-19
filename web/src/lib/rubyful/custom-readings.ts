/**
 * Rubyful V2 の自動生成では読みを取り違える語を上書きする。
 *
 * 代表例が日付の「月」で、既定では「つき」と振られてしまう。
 * 議会・予算の本文は日付表記が多いため、月名は「がつ」へ寄せる。
 */

const MONTH_READINGS = [
  "いちがつ",
  "にがつ",
  "さんがつ",
  "しがつ",
  "ごがつ",
  "ろくがつ",
  "しちがつ",
  "はちがつ",
  "くがつ",
  "じゅうがつ",
  "じゅういちがつ",
  "じゅうにがつ",
] as const;

const KANJI_NUMERALS = [
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
  "十一",
  "十二",
] as const;

const FULL_WIDTH_DIGITS = "０１２３４５６７８９";

function toFullWidthNumber(value: number): string {
  return String(value)
    .split("")
    .map((digit) => FULL_WIDTH_DIGITS[Number(digit)])
    .join("");
}

/** 「3月」「３月」「三月」のように、同じ月でも表記が揺れるため全て登録する。 */
export function buildMonthCustomReadings(): Record<string, string> {
  const readings: Record<string, string> = {};
  MONTH_READINGS.forEach((reading, index) => {
    const month = index + 1;
    readings[`${month}月`] = reading;
    readings[`${toFullWidthNumber(month)}月`] = reading;
    readings[`${KANJI_NUMERALS[index]}月`] = reading;
  });
  return readings;
}

/** 月以外で読みが落ちる・誤る語の個別指定。 */
const ADDITIONAL_READINGS: Record<string, string> = {
  協力: "きょうりょく",
  会派: "かいは",
  歳出: "さいしゅつ",
  歳入: "さいにゅう",
  款: "かん",
  項: "こう",
  目: "もく",
  節: "せつ",
};

export const RUBYFUL_CUSTOM_READINGS: Record<string, string> = {
  ...buildMonthCustomReadings(),
  ...ADDITIONAL_READINGS,
};
