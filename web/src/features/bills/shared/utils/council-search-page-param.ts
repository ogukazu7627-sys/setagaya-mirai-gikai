export const COUNCIL_SEARCH_PAGE_PARAM = "page";

/**
 * 検索結果のページ番号をURLから読み取る。
 * 不正値や1未満は1へ倒し、リロードや戻る操作で壊れないようにする。
 */
export function parseCouncilSearchPage(value: string | undefined): number {
  if (!value) {
    return 1;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

/**
 * URLへ載せるページ番号。1ページ目はパラメータを付けない。
 */
export function applyCouncilSearchPageParam(
  searchParams: URLSearchParams,
  page: number
): void {
  if (page <= 1) {
    searchParams.delete(COUNCIL_SEARCH_PAGE_PARAM);
    return;
  }
  searchParams.set(COUNCIL_SEARCH_PAGE_PARAM, String(page));
}
