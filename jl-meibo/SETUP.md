# JL大会 参加者管理システム — セットアップ手順

## 全体構成

```
https://so-ei.com/jl-meibo/  ← Vercelでホスティング（このアプリ）
            ↓
        Supabase ← 既存プロジェクトにテーブルを追加するだけ
```

社長のスマホ・PCも同じURLを開けばリアルタイムで同じデータが見られます（Supabase Realtime使用）。

---

## ステップ1: Supabaseにテーブルを追加

1. 既存の「ユニフォーム発注管理システム」が使っているSupabaseプロジェクトを開く
2. 左メニューの「SQL Editor」を開く
3. 同梱の `supabase_schema.sql` の内容を全部コピーして貼り付け、実行（Run）
4. 「Success」と出ればOK。これでテーブル(jl_events / jl_members / jl_checkins)が追加されます

既存システムのテーブルには影響しません。新しいテーブルが追加されるだけです。

---

## ステップ2: SupabaseのURLとキーを確認

1. Supabaseダッシュボード →「Settings」→「API」
2. 以下の2つをコピーしておく
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **anon public key**（長い文字列）

すでにso-ei.comのシステムで使っているものと同じです。

---

## ステップ3: Vercelにデプロイ

### 3-1. GitHubにアップロード（推奨）

1. GitHubで新しいリポジトリを作成（例: `jl-meibo`）
2. このフォルダの内容をプッシュ
   ```bash
   cd jl-meibo
   git init
   git add .
   git commit -m "初回コミット"
   git remote add origin https://github.com/【あなたのアカウント】/jl-meibo.git
   git push -u origin main
   ```

### 3-2. Vercelでプロジェクト作成

1. [vercel.com](https://vercel.com) にログイン（GitHubアカウントでOK）
2. 「Add New」→「Project」
3. 先ほどのGitHubリポジトリを選択して「Import」
4. 「Environment Variables」の欄に以下を追加
   - `NEXT_PUBLIC_SUPABASE_URL` → ステップ2のProject URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → ステップ2のanon key
5. 「Deploy」をクリック

数分でデプロイが完了し、`xxxxx.vercel.app` のようなURLが発行されます。

---

## ステップ4: so-ei.com/jl-meibo/ に割り当てる

現状の `so-ei.com/system/` と同じ要領で、ドメインのルーティングを設定します。

### エックスサーバー側でリバースプロキシが使える場合
`so-ei.com/jl-meibo/` へのアクセスをVercelのURLに転送する設定を行います。

### Vercelのドメイン機能を使う場合（より簡単）
1. Vercelプロジェクトの「Settings」→「Domains」
2. `so-ei.com` を追加し、表示されるDNS設定（CNAME等）を、現在お使いのDNS管理画面（RICOH/technowaveのネームサーバー）に追加
3. サブディレクトリ運用が難しい場合は、`jl-meibo.so-ei.com`（サブドメイン）の形にすると設定が簡単です

この部分はDNS管理者（RICOH/technowave側）の設定が必要なため、もし詰まった場合は教えてください。一時的に `xxxxx.vercel.app` のURLのまま使い始めることもできます。

---

## ステップ5: 大会データを登録

1. デプロイ後のURLを開く
2. 「大会」タブ →「+ 新しい大会を追加」で大会を作成
3. 「追加」タブからCSVをアップロード（九州・沖縄大会用のCSVは別途お渡しします）

---

## 困ったときは

- ページが真っ白 → Vercelの「Deployments」タブでビルドログを確認（環境変数の設定漏れが多い原因です）
- データが反映されない → Supabaseの「Table Editor」で `jl_members` にデータが入っているか確認
- 社長との共有がうまくいかない → 同じURLにアクセスしているか確認（リアルタイム反映は数秒かかることがあります）
