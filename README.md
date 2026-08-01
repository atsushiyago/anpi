# Mimamori-Call(仮)

高齢者向けの安否確認・見守りAIエージェント。[CALL-E](https://docs.heycall-e.com/) を使って
決まった時間に電話をかけ、体調や生活状況を簡単な会話で確認し、異常や応答なしの場合は
家族へ通知する。

**このエージェントは医療アドバイスや診断は一切行いません。** あくまで体調をヒアリングして
家族に伝える連絡係です。

## 現在の進捗

- [x] ステップ1: CALL-E SDKの疎通確認(最小構成)
- [ ] ステップ2: 見守り用の通話スクリプト設計
- [ ] ステップ3: 判定ロジック(異常なし/軽度の懸念/要エスカレーション)
- [ ] ステップ4: 家族向け通知(メール/LINE)
- [ ] ステップ5: 家族向けダッシュボード

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. CALL-Eアカウントとキーの準備

1. https://docs.heycall-e.com/ の案内に従ってCALL-Eアカウントを作成し、APIキーを発行する。
2. テスト発信に使う電話番号を用意する。**本人・家族の同意を得たテスト環境の番号のみ**を使うこと。
   実際の高齢者の番号に無断で発信しない。

### 3. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開いて以下を埋める(このファイルは `.gitignore` 済みでコミットされない):

| 変数名 | 説明 |
| --- | --- |
| `CALLE_API_KEY` | CALL-EダッシュボードのAPIキー |
| `CALLE_BASE_URL` | 通常は空欄でOK(SDKのデフォルトを使用)。CALL-Eからテスト用ベースURLを案内された場合はここに設定 |
| `CALLE_TEST_PHONE` | `npm run test:call` が発信するテスト用電話番号(E.164形式、例: `+819012345678`) |

### 4. 疎通確認(実際に1本テスト電話をかける)

```bash
npm run test:call
```

`scripts/test-call.ts` が `src/lib/calle/wellness-call.ts` のラッパー経由でCALL-Eに1本発信し、
通話が完了するまで待って結果(ステータス・構造化データ・要約)をコンソールに表示する。

- 実際に電話がかかり、CALL-Eの利用枠を消費するので、同意の取れたテスト番号以外には向けないこと。
- 失敗する場合は `CALLE_API_KEY` / `CALLE_TEST_PHONE` の設定、CALL-Eダッシュボード側の
  アカウント状態(与信・番号のE.164フォーマットなど)を確認する。

## コード構成

```
src/lib/calle/
  client.ts          CalleClientのシングルトン生成(env: CALLE_API_KEY, CALLE_BASE_URL)
  wellness-call.ts    発信 / 結果取得のラッパー関数(placeCall, placeCallAndWait, getCallResult)
scripts/
  test-call.ts        疎通確認用の最小スクリプト(npm run test:call)
```

## 開発サーバー

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開く。

## 制約・注意事項

- 医療アドバイスや診断は行わない。
- 電話番号・個人情報はダミーデータで開発し、実際の高齢者への発信は本人・家族の同意を得た
  テスト環境のみで行う。
- `CALLE_API_KEY` / `CALLE_BASE_URL` は `.env.local` で管理し、リポジトリにコミットしない。
# anpi
