# 点検・監査管理システム

React + TypeScript + Vite + Tailwind CSS + Supabase を用いて開発した、業務改善ポートフォリオ用の Web アプリです。

紙や Excel ベースで管理されがちな点検・監査業務を、  
**点検対象管理 / テンプレート管理 / 点検実施 / 結果確認 / 結果編集** まで一元管理できるようにすることを目的としています。

---

## アプリ概要

このアプリは、現場で行う日常点検や監査業務を Web 化し、以下を実現するための MVP として開発しました。

- 点検対象の登録・管理
- 点検テンプレートの登録・管理
- テンプレートごとの点検項目管理
- 点検実施結果の登録
- 点検履歴の一覧確認
- 点検詳細の確認
- 点検結果の編集

単なる一覧表示ではなく、  
**「マスタ作成 → 点検実施 → 履歴確認 → 編集」** まで、実務フローに沿った構成にしています。

---

## 想定利用シーン

- 倉庫 / 工場 / 事業所での設備点検
- フォークリフトや安全設備の日常点検
- テンプレート化された点検表を使った巡回点検
- 紙運用からデジタル管理へ移行したい現場

---

## 主な機能

### 1. 認証機能
- Supabase Auth を用いたログイン / ログアウト
- 保護ルートによるログインユーザー限定アクセス
- `profiles` テーブルと連動したユーザー情報表示

### 2. 点検対象管理
- 点検対象の新規登録
- 一覧表示
- 編集
- 有効 / 無効切り替え
- キーワード検索
- 状態絞り込み
- カテゴリ絞り込み

### 3. 点検テンプレート管理
- 点検テンプレートの新規登録
- 一覧表示
- 編集
- 有効 / 無効切り替え
- キーワード検索
- 状態絞り込み
- カテゴリ絞り込み

### 4. テンプレート項目管理
- テンプレートごとの点検項目登録
- 表示順管理
- 必須 / 任意設定
- 編集
- 削除

### 5. 点検実施
- 点検対象選択
- テンプレート選択
- 点検日入力
- 点検者自動反映
- テンプレート項目の自動展開
- 項目ごとの結果入力
  - OK
  - NG
  - 対象外
- 項目コメント入力
- 全体コメント入力
- 異常内容コメント入力
- `inspections` / `inspection_results` への保存

### 6. 点検履歴一覧
- 点検実施一覧表示
- 点検件数 / 異常あり件数 / 正常件数の表示
- キーワード検索
- 異常有無絞り込み
- 詳細画面への導線
- 編集画面への導線

### 7. 点検詳細 / 編集
- 点検基本情報の表示
- 点検者情報の表示
- 項目ごとの結果一覧表示
- 登録済み結果の編集
- NG 項目コメントを考慮した異常判定

### 8. ダッシュボード
- 点検対象数
- 有効な点検対象数
- テンプレート数
- 有効テンプレート数
- 点検項目数
- 点検実施数
- 最近登録した点検対象
- 最近登録したテンプレート
- 最近の点検実施

---

## 使用技術

### フロントエンド
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

### バックエンド / BaaS
- Supabase
  - Supabase Auth
  - Supabase Postgres
  - Row Level Security

### 開発環境
- Node.js
- npm
- VS Code

---

## 技術的なポイント

- React Router による画面遷移管理
- Supabase Auth を使った認証制御
- RLS を有効にしたテーブル設計
- テンプレート選択時に点検項目を自動読込
- 点検ヘッダと点検結果明細を分けた親子構造
- 編集時に `inspection_results` を upsert / delete で整合性維持
- NG 項目コメントがある場合、異常内容コメントの入力負荷を下げる UX 改善

---

## テーブル構成

### profiles
ログインユーザーのプロフィール情報を管理します。

- `id`
- `name`
- `role`

### inspection_targets
点検対象のマスタです。

- `id`
- `name`
- `category`
- `location`
- `is_active`
- `created_at`
- `updated_at`

### inspection_templates
点検テンプレートのマスタです。

- `id`
- `name`
- `category`
- `is_active`
- `created_at`
- `updated_at`

### inspection_template_items
テンプレートごとの点検項目です。

- `id`
- `template_id`
- `item_name`
- `sort_order`
- `is_required`
- `created_at`
- `updated_at`

### inspections
点検実施のヘッダ情報です。

- `id`
- `target_id`
- `template_id`
- `inspection_date`
- `inspector_id`
- `abnormal_flag`
- `comment`
- `abnormal_comment`

### inspection_results
点検結果の明細です。

- `id`
- `inspection_id`
- `template_item_id`
- `result`
- `comment`

---

## 画面構成

- `/login`
  - ログイン画面

- `/dashboard`
  - ダッシュボード

- `/targets`
  - 点検対象管理

- `/templates`
  - 点検テンプレート管理

- `/templates/:templateId/items`
  - テンプレート項目管理

- `/inspections`
  - 点検実施一覧

- `/inspections/new`
  - 新規点検登録

- `/inspections/:inspectionId`
  - 点検詳細

- `/inspections/:inspectionId/edit`
  - 点検結果編集

---

## 画面イメージ

実際の画面キャプチャは `docs/` フォルダや GitHub の README に追記予定です。

例:

- ダッシュボード
- 点検対象管理
- テンプレート管理
- テンプレート項目管理
- 点検実施一覧
- 新規点検登録
- 点検詳細
- 点検結果編集

---

## ディレクトリ構成（例）

```text
src/
  app/
    App.tsx
    components/
      layout/
        AppHeaderNav.tsx

  lib/
    supabase.ts

  pages/
    auth/
      LoginPage.tsx
    dashboard/
      DashboardPage.tsx
    targets/
      InspectionTargetsPage.tsx
    templates/
      InspectionTemplatesPage.tsx
    template-items/
      InspectionTemplateItemsPage.tsx
    inspections/
      InspectionsPage.tsx
      NewInspectionPage.tsx
      InspectionDetailPage.tsx
      EditInspectionPage.tsx

  providers/
    AuthProvider.tsx

  routes/
    AppShell.tsx
    ProtectedRoute.tsx
    index.tsx