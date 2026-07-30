/**
 * ページレイアウトに関するユーティリティ
 *
 * TOPページ、議会トップ、案件詳細ページは「メインページ」として扱う。
 * PCのチャットサイドバー用オフセットは、実際にパネルを表示する
 * 案件詳細ページだけに適用する。
 */

/** メインページ（TOP、議会トップ、案件詳細）かどうかを判定 */
export function isMainPage(pathname: string): boolean {
  // トップページ
  if (pathname === "/") return true;
  // 議会トップ
  if (pathname === "/bills" || pathname === "/bills/") return true;
  // 案件詳細ページ（/bills/[id]）- サブパスは除外
  if (/\/bills\/[^/]+$/.test(pathname)) return true;
  return false;
}

/** PCで常設AIパネル分の横幅を確保するページかどうかを判定 */
export function hasPersistentChatSidebar(pathname: string): boolean {
  return /^\/(?:preview\/)?bills\/[^/]+$/.test(pathname);
}

/** コンテンツをヘッダー幅まで広げるページかどうかを判定 */
export function isWidePage(pathname: string): boolean {
  return (
    pathname === "/budget" ||
    pathname.startsWith("/budget/") ||
    pathname === "/learn" ||
    pathname.startsWith("/learn/")
  );
}

/** インタビューチャットページかどうかを判定 */
export function isInterviewPage(pathname: string): boolean {
  // /bills/[id]/interview/chat
  return /\/bills\/[^/]+\/interview\/chat$/.test(pathname);
}

/** インタビューセクション（LP・チャット含む）かどうかを判定 */
export function isInterviewSection(pathname: string): boolean {
  // /bills/[id]/interview 以下すべて
  return /\/bills\/[^/]+\/interview(\/|$)/.test(pathname);
}

/** インタビューページからbillIdを抽出 */
export function extractBillIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/bills\/([^/]+)/);
  return match ? match[1] : null;
}
