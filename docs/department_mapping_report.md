# 令和8年度予算 部署表示名マッピングレポート

## 最終判定

**PASS**

- マッピング対象raw値: 136件
- マッピング設定: 136件
- `matched`: 125件
- `already_display`: 11件
- `needs_review`: 0件

## 入力と出力

- 入力: `processed/budget_programs.csv`（Phase 16基準）
- 根拠: `raw/r8tousyoyosanallpage.pdf`
- 設定: `config/department_name_map.csv`
- 出力: `processed/budget_programs.csv`

## 照合方法

1. 公式CSVの `department_name` をraw値として保持した。
2. `＊`より後ろは課・担当名として原文のまま保持した。
3. 各 `budget_item_key` のPDF節ページ範囲と前後ページを対象にした。
4. 内訳事業名を優先し、次に予算事業名と金額を照合した。
5. 一致したPDF説明欄の括弧内組織名を親組織名とした。
6. 同じraw値に複数の親組織候補がある場合は自動確定しない。

## 既存データ保全

| 検証 | 結果 |
| --- | --- |
| 行数 | 1,170行 |
| Phase 16既存列 | 28列、全1,170行一致 |
| `department_name` | 変更なし |
| ID・行順・金額 | 変更なし |
| 追加列 | `department_display_name`, `department_mapping_status` |

## 事業行のステータス

| status | 行数 |
| --- | ---: |
| `matched` | 1,118 |
| `already_display` | 52 |
| `needs_review` | 0 |

## Needs Review

- なし

## マッピング一覧

| department_name_raw | department_display_name | status | source |
| --- | --- | --- | --- |
| ＤＸ＊ＤＸ推進担当課 | DX推進担当部 ＤＸ推進担当課 | `matched` | `official_pdf` |
| スポ推進＊スポーツ施設課 | スポーツ推進部 スポーツ施設課 | `matched` | `official_pdf` |
| スポ推進＊スポーツ推進課 | スポーツ推進部 スポーツ推進課 | `matched` | `official_pdf` |
| スポ推進＊拠点スポ整備課 | スポーツ推進部 拠点スポ整備課 | `matched` | `official_pdf` |
| み３３＊公園利活用推進課 | みどり33推進担当部 公園利活用推進課 | `matched` | `official_pdf` |
| みどり３３＊みどり政策課 | みどり33推進担当部 みどり政策課 | `matched` | `official_pdf` |
| みどり３３＊公園緑地課 | みどり33推進担当部 公園緑地課 | `matched` | `official_pdf` |
| 烏センター＊健康づくり課 | 烏山総合支所 健康づくり課 | `matched` | `official_pdf` |
| 烏センター＊子家庭支援課 | 烏山総合支所 子家庭支援課 | `matched` | `official_pdf` |
| 烏センター＊生活支援課 | 烏山総合支所 生活支援課 | `matched` | `official_pdf` |
| 烏センター＊保健福祉課 | 烏山総合支所 保健福祉課 | `matched` | `official_pdf` |
| 烏支＊駅周辺整備担当課 | 烏山総合支所 駅周辺整備担当課 | `matched` | `official_pdf` |
| 烏支＊街づくり課 | 烏山総合支所 街づくり課 | `matched` | `official_pdf` |
| 烏支＊地域振興課 | 烏山総合支所 地域振興課 | `matched` | `official_pdf` |
| 営繕＊公マネ課 | 施設営繕担当部 公マネ課 | `matched` | `official_pdf` |
| 会計＊会計課 | 会計室 会計課 | `matched` | `official_pdf` |
| 学教＊学校職員課 | 教育委員会事務局 学校職員課 | `matched` | `official_pdf` |
| 学教＊学務課 | 教育委員会事務局 学務課 | `matched` | `official_pdf` |
| 学教＊教育指導課 | 教育委員会事務局 教育指導課 | `matched` | `official_pdf` |
| 学教＊地域学校連携課 | 教育委員会事務局 地域学校連携課 | `matched` | `official_pdf` |
| 環境政策部＊環境保全課 | 環境政策部 環境保全課 | `already_display` | `official_csv` |
| 環政＊環境政策課 | 環境政策部 環境政策課 | `matched` | `official_pdf` |
| 環政＊気候危機対策課 | 環境政策部 気候危機対策課 | `matched` | `official_pdf` |
| 監査事務局 | 監査事務局 | `already_display` | `official_csv` |
| 危管＊地域生活安全課 | 危機管理部 地域生活安全課 | `matched` | `official_pdf` |
| 危機管理部＊災害対策課 | 危機管理部 災害対策課 | `already_display` | `official_csv` |
| 砧センター＊健康づくり課 | 砧総合支所 健康づくり課 | `matched` | `official_pdf` |
| 砧センター＊子家庭支援課 | 砧総合支所 子家庭支援課 | `matched` | `official_pdf` |
| 砧センター＊生活支援課 | 砧総合支所 生活支援課 | `matched` | `official_pdf` |
| 砧センター＊保健福祉課 | 砧総合支所 保健福祉課 | `matched` | `official_pdf` |
| 砧支＊街づくり課 | 砧総合支所 街づくり課 | `matched` | `official_pdf` |
| 砧支＊地域振興課 | 砧総合支所 地域振興課 | `matched` | `official_pdf` |
| 教セ＊教育ＤＸ推進担当課 | 教育委員会事務局 教育ＤＸ推進担当課 | `matched` | `official_pdf` |
| 教セ＊教育相談課 | 教育委員会事務局 教育相談課 | `matched` | `official_pdf` |
| 教セ＊支援教育課 | 教育委員会事務局 支援教育課 | `matched` | `official_pdf` |
| 教セ＊事業推進担当課 | 教育委員会事務局 事業推進担当課 | `matched` | `official_pdf` |
| 教セ＊乳幼教・保支課 | 教育委員会事務局 乳幼教・保支課 | `matched` | `official_pdf` |
| 教生＊学校健康推進課 | 教育委員会事務局 学校健康推進課 | `matched` | `official_pdf` |
| 教生＊教育環境課 | 教育委員会事務局 教育環境課 | `matched` | `official_pdf` |
| 教生＊教育総務課 | 教育委員会事務局 教育総務課 | `matched` | `official_pdf` |
| 教生＊生涯学習課 | 教育委員会事務局 生涯学習課 | `matched` | `official_pdf` |
| 教生＊中央図書館 | 教育委員会事務局 中央図書館 | `matched` | `official_pdf` |
| 玉センター＊健康づくり課 | 玉川総合支所 健康づくり課 | `matched` | `official_pdf` |
| 玉センター＊子家庭支援課 | 玉川総合支所 子家庭支援課 | `matched` | `official_pdf` |
| 玉センター＊生活支援課 | 玉川総合支所 生活支援課 | `matched` | `official_pdf` |
| 玉センター＊保健福祉課 | 玉川総合支所 保健福祉課 | `matched` | `official_pdf` |
| 玉支＊街づくり課 | 玉川総合支所 街づくり課 | `matched` | `official_pdf` |
| 玉支＊地域振興課 | 玉川総合支所 地域振興課 | `matched` | `official_pdf` |
| 区議会事務局 | 区議会事務局 | `already_display` | `official_csv` |
| 区長室＊秘書課 | 区長室 秘書課 | `already_display` | `official_csv` |
| 経産＊経済課 | 経済産業部 経済課 | `matched` | `official_pdf` |
| 経産＊工・建・雇用促進課 | 経済産業部 工・建・雇用促進課 | `matched` | `official_pdf` |
| 経産＊商業課 | 経済産業部 商業課 | `matched` | `official_pdf` |
| 経産＊消費生活課 | 経済産業部 消費生活課 | `matched` | `official_pdf` |
| 経産＊都市農業課 | 経済産業部 都市農業課 | `matched` | `official_pdf` |
| 高福＊介護保険課 | 高齢福祉部 介護保険課 | `matched` | `official_pdf` |
| 高福＊介護予防・支援課 | 高齢福祉部 介護予防・支援課 | `matched` | `official_pdf` |
| 高福＊高齢福祉課 | 高齢福祉部 高齢福祉課 | `matched` | `official_pdf` |
| 財務＊用地課 | 財務部 用地課 | `matched` | `official_pdf` |
| 財務部＊課税課 | 財務部 課税課 | `already_display` | `official_csv` |
| 財務部＊経理課 | 財務部 経理課 | `already_display` | `official_csv` |
| 財務部＊納税課 | 財務部 納税課 | `already_display` | `official_csv` |
| 子若＊子ども・若者支援課 | 子ども・若者部 子ども・若者支援課 | `matched` | `official_pdf` |
| 子若＊子ども家庭課 | 子ども・若者部 子ども家庭課 | `matched` | `official_pdf` |
| 子若＊児童課 | 子ども・若者部 児童課 | `matched` | `official_pdf` |
| 子若＊児童相談支援課 | 子ども・若者部 児童相談支援課 | `matched` | `official_pdf` |
| 子若＊保育課 | 子ども・若者部 保育課 | `matched` | `official_pdf` |
| 子若＊保育認定・調整課 | 子ども・若者部 保育認定・調整課 | `matched` | `official_pdf` |
| 児相＊児童相談課 | 児童相談所 児童相談課 | `matched` | `official_pdf` |
| 児童相談所＊一時保護課 | 児童相談所 一時保護課 | `already_display` | `official_csv` |
| 障福＊障害施策課 | 障害福祉部 障害施策課 | `matched` | `official_pdf` |
| 障福＊障害地域生活課 | 障害福祉部 障害地域生活課 | `matched` | `official_pdf` |
| 障福＊障害保健福祉課 | 障害福祉部 障害保健福祉課 | `matched` | `official_pdf` |
| 世センター＊健康づくり課 | 世田谷総合支所 健康づくり課 | `matched` | `official_pdf` |
| 世センター＊子家庭支援課 | 世田谷総合支所 子家庭支援課 | `matched` | `official_pdf` |
| 世センター＊生活支援課 | 世田谷総合支所 生活支援課 | `matched` | `official_pdf` |
| 世センター＊保健福祉課 | 世田谷総合支所 保健福祉課 | `matched` | `official_pdf` |
| 世支＊街づくり課 | 世田谷総合支所 街づくり課 | `matched` | `official_pdf` |
| 世支＊地域振興課 | 世田谷総合支所 地域振興課 | `matched` | `official_pdf` |
| 世保＊感染症対策課 | 世田谷保健所 感染症対策課 | `matched` | `official_pdf` |
| 世保＊健康企画課 | 世田谷保健所 健康企画課 | `matched` | `official_pdf` |
| 世保＊健康推進課 | 世田谷保健所 健康推進課 | `matched` | `official_pdf` |
| 世保＊生活保健課 | 世田谷保健所 生活保健課 | `matched` | `official_pdf` |
| 政策＊ふるさと納税対策課 | 政策経営部 ふるさと納税対策課 | `matched` | `official_pdf` |
| 政策＊官民行政手法改革課 | 政策経営部 官民行政手法改革課 | `matched` | `official_pdf` |
| 政策＊広報広聴課 | 政策経営部 広報広聴課 | `matched` | `official_pdf` |
| 政策＊財政課 | 政策経営部 財政課 | `matched` | `official_pdf` |
| 政策＊政策企画課 | 政策経営部 政策企画課 | `matched` | `official_pdf` |
| 政策＊政策研究・調査課 | 政策経営部 政策研究・調査課 | `matched` | `official_pdf` |
| 清掃・リサ＊管理課 | 環境政策部 管理課 | `matched` | `official_pdf` |
| 清掃＊砧清掃事務所 | 環境政策部 砧清掃事務所 | `matched` | `official_pdf` |
| 清掃＊玉川清掃事務所 | 環境政策部 玉川清掃事務所 | `matched` | `official_pdf` |
| 清掃＊事業課 | 環境政策部 事業課 | `matched` | `official_pdf` |
| 清掃＊世田谷清掃事務所 | 環境政策部 世田谷清掃事務所 | `matched` | `official_pdf` |
| 生政＊健康村・ふる交流課 | 生活文化政策部 健康村・ふる交流課 | `matched` | `official_pdf` |
| 生政＊市民活動推進課 | 生活文化政策部 市民活動推進課 | `matched` | `official_pdf` |
| 生政＊人権男女共同参画課 | 生活文化政策部 人権男女共同参画課 | `matched` | `official_pdf` |
| 生政＊文化・国際課 | 生活文化政策部 文化・国際課 | `matched` | `official_pdf` |
| 選挙管理委員会事務局 | 選挙管理委員会事務局 | `already_display` | `official_csv` |
| 総務＊区政情報課 | 総務部 区政情報課 | `matched` | `official_pdf` |
| 総務＊研修担当課 | 総務部 研修担当課 | `matched` | `official_pdf` |
| 総務＊職員厚生課 | 総務部 職員厚生課 | `matched` | `official_pdf` |
| 総務＊人事課 | 総務部 人事課 | `matched` | `official_pdf` |
| 総務＊総務課 | 総務部 総務課 | `matched` | `official_pdf` |
| 地域行政部＊地域行政課 | 地域行政部 地域行政課 | `already_display` | `official_csv` |
| 地行＊マイナンバー担当課 | 地域行政部 マイナンバー担当課 | `matched` | `official_pdf` |
| 地行＊住民記録・戸籍課 | 地域行政部 住民記録・戸籍課 | `matched` | `official_pdf` |
| 庁舎＊庁舎管理担当課 | 庁舎整備担当部 庁舎管理担当課 | `matched` | `official_pdf` |
| 都政＊居住支援課 | 都市整備政策部 居住支援課 | `matched` | `official_pdf` |
| 都政＊建築調整課 | 都市整備政策部 建築調整課 | `matched` | `official_pdf` |
| 都政＊住宅課 | 都市整備政策部 住宅課 | `matched` | `official_pdf` |
| 都政＊都市デザイン課 | 都市整備政策部 都市デザイン課 | `matched` | `official_pdf` |
| 都政＊都市計画課 | 都市整備政策部 都市計画課 | `matched` | `official_pdf` |
| 土＊交通安全自転車課 | 土木部 交通安全自転車課 | `matched` | `official_pdf` |
| 土＊工事第一課 | 土木部 工事第一課 | `matched` | `official_pdf` |
| 土＊工事第二課 | 土木部 工事第二課 | `matched` | `official_pdf` |
| 土＊豪雨・下水道整備課 | 土木部 豪雨・下水道整備課 | `matched` | `official_pdf` |
| 土＊土木計画調整課 | 土木部 土木計画調整課 | `matched` | `official_pdf` |
| 道計＊交通政策課 | 道路・交通計画部 交通政策課 | `matched` | `official_pdf` |
| 道計＊道路管理課 | 道路・交通計画部 道路管理課 | `matched` | `official_pdf` |
| 道計＊道路計画課 | 道路・交通計画部 道路計画課 | `matched` | `official_pdf` |
| 道計＊道路事業推進課 | 道路・交通計画部 道路事業推進課 | `matched` | `official_pdf` |
| 保政＊国保・年金課 | 保健福祉政策部 国保・年金課 | `matched` | `official_pdf` |
| 保政＊生活福祉課 | 保健福祉政策部 生活福祉課 | `matched` | `official_pdf` |
| 保政＊保健福祉政策課 | 保健福祉政策部 保健福祉政策課 | `matched` | `official_pdf` |
| 保政＊保険料収納課 | 保健福祉政策部 保険料収納課 | `matched` | `official_pdf` |
| 保政＊保福推進課 | 保健福祉政策部 保福推進課 | `matched` | `official_pdf` |
| 防街＊建築安全課 | 防災街づくり担当部 建築安全課 | `matched` | `official_pdf` |
| 防街＊市街地整備課 | 防災街づくり担当部 市街地整備課 | `matched` | `official_pdf` |
| 防街＊防災街づくり課 | 防災街づくり担当部 防災街づくり課 | `matched` | `official_pdf` |
| 北センター＊健康づくり課 | 北沢総合支所 健康づくり課 | `matched` | `official_pdf` |
| 北センター＊子家庭支援課 | 北沢総合支所 子家庭支援課 | `matched` | `official_pdf` |
| 北センター＊生活支援課 | 北沢総合支所 生活支援課 | `matched` | `official_pdf` |
| 北センター＊保健福祉課 | 北沢総合支所 保健福祉課 | `matched` | `official_pdf` |
| 北支＊街づくり課 | 北沢総合支所 街づくり課 | `matched` | `official_pdf` |
| 北支＊地域振興課 | 北沢総合支所 地域振興課 | `matched` | `official_pdf` |
