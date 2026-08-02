# Mimamori-Call プロジェクト引き継ぎメモ(2026-08-02時点)

CALL-Eハッカソン(`CALL-E: Your Code Is Calling`, 締切 2026-09-14 23:45 SGT)への提出物として開発中。
高齢者向けの電話安否確認サービス。CALL-Eで毎日電話をかけ、3つの質問(体調・食事・困りごと)を尋ね、
結果を3段階判定して家族にメール通知する。家族向けダッシュボード(Next.js)も並行して開発中。

このメモをClaude Codeに渡して、これまでの経緯とハマりどころを引き継ぐことを想定している。

---

## 技術スタック

- Next.js (App Router) + TypeScript + React
- CALL-E SDK: `@call-e/calle` **v0.6.0**(重要:beta.1は古く不具合あり、後述)
- メール通知: Resend(`resend` npmパッケージ)
- データ保存: **Upstash Redis**(REST API、`@upstash/redis`)。無料枠で永続化できる。
  経緯: JSONファイル(`data/wellness-data.json`)→Postgres/Neonを試して撤回→Vercelのサーバーレスは
  ファイルシステムに書けないためJSONファイル方式もNG→RenderもRailwayも無料枠では永続ディスクが
  使えず月$5〜7かかると判明→無料で使えるUpstash Redisに切り替え(2026-08-02)。
  `store.ts`の公開関数のシグネチャは変更していないので呼び出し側の修正は不要だった。
  旧`data/wellness-data.json`は`npm run migrate:to-redis`で1回だけRedisに移行できる
  (実データ・個人情報が入っているため、移行後は削除を検討)。
- スタイリング: Tailwindなし、CSS Modulesのみ

## ディレクトリ構成(現状)

```
scripts/
  test-call.mts        # CALL-E単体の疎通確認スクリプト
  test-notify.mts       # 発信→メール通知までの一気通貫テスト
  inspect-call.mts      # 過去のcall.idから結果を取得するデバッグ用
src/lib/
  calle/
    client.ts           # CalleClientのシングルトン生成
    wellness-call.ts     # placeCall / placeCallAndWait / getCallResult
    classify.ts          # 3段階判定ロジック(ok / mild_concern / escalate)
    wellness-script.ts    # 3問構成のtask文とresultSchema(共通化済み)
  notify/
    email.ts             # Resendでの通知メール送信、件名・本文組み立て
  store.ts               # JSONファイルベースの永続化(recipients, calls)
  wellness-service.ts     # runWellnessCheck() — 発信→判定→保存→通知の共通処理
src/app/
  dashboard/
    page.tsx             # ダッシュボード本体(対象者登録・編集・履歴・発信ボタン)
    dashboard.module.css
  api/
    recipients/route.ts       # GET一覧 / POST新規登録
    recipients/[id]/route.ts  # PATCH更新
    calls/route.ts             # GET履歴 / POST単発発信
    calls/call-all/route.ts    # POST一括発信(登録済み全員)
    cron/daily-wellness-check/route.ts  # Vercel Cron用(現状は未使用、後述)
vercel.json               # Cronスケジュール設定(現状Vercel未デプロイなので実質未使用)
init.sql                  # Postgres用テーブル定義(Postgres撤回につき現状不要)
```

## 環境変数(`.env.local`)

```
CALLE_API_KEY=...
CALLE_BASE_URL=https://api.heycall-e.com   # 空だと発信時に原因不明のURLエラーになる
CALLE_TEST_PHONE=+81...                     # scripts/test-call.mts用
CALLE_TEST_RECIPIENT_NAME=...               # 任意
RESEND_API_KEY=re_...
FAMILY_TEST_EMAIL=...                       # scripts/test-notify.mts用
CRON_SECRET=...                              # 現状Cron未使用のため優先度低
```

---

## ハマったポイントと解決策(重要、繰り返さないこと)

1. **`dotenv/config`は`.env.local`を読まない**
   `tsx`スクリプトで`import "dotenv/config"`と書くと`.env`しか読まれない。
   `dotenv.config({ path: ".env.local" })`と明示する必要がある。

2. **`CALLE_BASE_URL`が空だと`Invalid URL: input: '/v1/calls'`エラー**
   SDKの`baseUrl`が空文字になり、パスだけでfetchしようとして失敗する。

3. **SDK `beta.1`は古く、実APIと食い違う**
   `@call-e/calle@beta`でインストールすると`0.1.0-beta.1`が入ることがあった。
   このバージョンでは`recipient`/`policy`フィールドを送ると`422 extra_forbidden`になる。
   `npm install @call-e/calle@latest`で`0.6.0`に上げたら解消。
   **現行(0.6.0)の型定義では`recipient`は正式にサポートされている**(`CreateCallInput.recipient?: CallRecipientInput`)。

4. **`task`文に終了条件を明示しないと無限ループする**
   「体調はいかがですか」とだけ聞くと、ネガティブな回答(「気持ち悪い」等)のときに
   CALL-Eが完了と判断できず「聞こえていますか?」を繰り返し、最終的に最初の質問からやり直すことがあった。
   `task`に「回答が得られたら(内容が良くても悪くても)次の質問に進んでください」
   「同じ質問を繰り返さないでください」を明記したら解消(`wellness-script.ts`のWELLNESS_TASK参照)。

5. **日本語の会話に英語のフレーズが混入することがある**("No rush." など)
   単発、または繰り返し発生することもある。原因不明、CALL-E側のTTS/内部処理の不具合と思われる。
   Discordフィードバックで報告済み。

6. **「話し中」で切れて自動リトライされる**
   同一`idempotencyKey`だと同じ通話タスクの続きとして扱われ、
   「約45分後に再試行できます」のような制限にかかることがある。
   `idempotencyKey`にタイムスタンプ(`Date.now()`)を含めることで新規通話として扱われる。
   `wellness-service.ts`では`wellness:${recipient.id}:${Date.now()}`を使用。

7. **`createAndWait`のデフォルトタイムアウト(5分)で正常終了した通話が「失敗」扱いになることがある**
   話し中リトライを挟むと5分を超えることがあるため、`timeoutMs`は10分程度に伸ばしてある。
   タイムアウトしても実際には通話が完了していることが多いので、`call.id`から`calls.get()`で
   後追い確認できる(`inspect-call.mts`参照)。

8. **Resendはテストモードだと自分のアカウントのメールアドレス宛てにしか送れない**
   ドメイン未認証の場合、`familyEmail`が自分以外だと`403 validation_error`になる。
   → `wellness-service.ts`では、メール送信の失敗が通話全体の失敗として扱われないよう、
   通知だけ別の`try/catch`で囲み、`notified: false`として結果に含める設計に変更済み。
   ダッシュボード側もこれを受けて「通話は成功したが通知は送れなかった」旨を表示する。

9. **Vercelのサーバーレス関数はファイルシステムに書き込めない**
   JSONファイル方式の`store.ts`をそのままVercelにデプロイすると
   `ENOENT: no such file or directory, mkdir '/var/task/data'`で失敗する。
   → Neon(Postgres、Vercelの旧Vercel Postgresの後継)への切り替えを試みたが、
   SQLエディタでの`read-only transaction`エラーなど設定沼にハマり、
   **応募規模(3人程度への発信)には過剰と判断して撤回**。
   `store.ts`はJSONファイル版に戻した(現在のバージョン)。
   Vercel本番デプロイ自体は保留中。ローカル(`npm run dev`)での動作確認のみ実施済み。

10. **コンテスト提出要件の確認済み事項**(`call-e.devpost.com/rules`より)
    - 提出に必須: `awesome-phone-call-agents`へのPR、デモ動画(~3分、YouTube/Vimeo公開)、CALL-Eアカウントのメール
    - 公開URL(動作するデモ)は**任意**(Optional)。ただし提出物へのアクセスは
      "Access must be provided... for judging and testing"とあり、審査員がテストしないことは
      許容されているが、テストされる可能性を考えて準備はしておく方が安全
    - 提出物の文章・動画は英語(または英訳付き)が必要。開発中のやり取り自体は日本語のままでよい

---

## 現在の状態(2026-08-02時点)

- ローカル環境で、発信→判定→ダッシュボード表示→(可能な場合)メール通知、まで一通り動作確認済み
- ダッシュボードに以下の機能あり:
  - 見守り対象者の登録・編集(名前・電話番号・通知先メール)
  - 対象者ごとの通話履歴一覧(判定バッジ、要約、理由)
  - 「今すぐ電話する」(単発発信)ボタン
  - 「登録済み全員に今すぐ電話する」(一括発信)ボタン ※本日追加、ローカルでの動作確認済み(順次発信・各自の質問・通話履歴の記録まで正常動作)
- 発信・判定・保存・通知のロジックは`wellness-service.ts`の`runWellnessCheck()`に一本化済み。
  単発発信API・一括発信API・Cron(未使用)の3箇所から共通で呼ばれる設計。

## 未着手・今後の課題

1. **公開デモの扱い**
   - データ保存をUpstash Redisに切り替え。Vercel(サーバーレス)にそのままデプロイ可能になった。
     Render/Railwayへの移行は不要と判断(無料枠では月$5〜7かかると判明したため)。
   - Upstash Redis作成(リージョン: AWS us-east-1)、`.env.local`への環境変数設定、
     `npm run migrate:to-redis`での既存データ移行、`npm run dev`での動作確認まで完了(2026-08-02)。
   - 残タスク: Vercel側にも同じ`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`を設定して
     本番デプロイ確認。旧`data/wellness-data.json`(実データ入り)の削除。
   - 実の家族の電話番号・通話履歴(体調情報を含む)は、公開前に必ず削除・リセットすること。
   - 審査員に自分の電話番号を対象者として登録してもらい、動作確認してもらう方針で合意
2. **Resendのメール通知**:ドメイン未認証のままだと審査員宛ての通知は必ず失敗する。
   コスト(ドメイン取得)をかけない方針で合意。通知失敗時もアプリ全体は壊れない設計にしてあるので、
   README上で「デモ環境では通知メールが届かないことがある」旨を明記する想定
3. **README整備**
4. **`awesome-phone-call-agents`へのPR作成**(README記載のContribution Areaを要確認)
5. **デモ動画撮影(~3分)**
6. (完了済み)CALL-Eフィードバックサーベイの提出、Discord `#support`への投稿

## 進め方の背景・ユーザーの状況

- ハッカソン参加者(Atsushi)は、この会話の中でCALL-EのSDK・API・Vercel・Neonなど
  複数の技術要素を初めて触りながら一つずつ学習・デバッグしてきた
- 「データベースまわりはややこしい」という感想があり、規模(3人程度への発信)に対して
  過剰な技術選定は避け、シンプルさを優先する方針
- 本メモ作成時点で、今後の開発はClaude.aiでの相談からClaude Code(ターミナル)への
  移行を検討中。GUI操作(Vercelダッシュボード等)のスクリーンショット共有は
  Claude Codeでも`Ctrl+V`貼り付け/ドラッグ&ドロップ/ファイルパス指定で可能。
