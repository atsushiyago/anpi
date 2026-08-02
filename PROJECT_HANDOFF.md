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

9. **Vercelのサーバーレス関数はファイルシステムに書き込めない**(解決済み)
   JSONファイル方式の`store.ts`をそのままVercelにデプロイすると
   `ENOENT: no such file or directory, mkdir '/var/task/data'`で失敗する。
   → Neon(Postgres)への切り替えを試みたが設定沼にハマり撤回。
   → Render/Railwayへの移行も検討したが、無料枠では永続ディスクが使えず月$5〜7かかると判明。
   → 最終的に**Upstash Redis**(REST API、無料枠)に切り替えて解決(2026-08-02)。
   `store.ts`の公開関数シグネチャは変えていないので呼び出し側は無修正。
   Vercel本番デプロイ済み、動作確認済み。

10. **コンテスト提出要件の確認済み事項**(`call-e.devpost.com/rules`より)
    - 提出に必須: `awesome-phone-call-agents`へのPR、デモ動画(~3分、YouTube/Vimeo公開)、CALL-Eアカウントのメール
    - 公開URL(動作するデモ)は**任意**(Optional)。ただし提出物へのアクセスは
      "Access must be provided... for judging and testing"とあり、審査員がテストしないことは
      許容されているが、テストされる可能性を考えて準備はしておく方が安全
    - 提出物の文章・動画は英語(または英訳付き)が必要。開発中のやり取り自体は日本語のままでよい

11. **`vercel env add`に値をパイプすると、`.env.local`側の値がクォート付きだとそのまま登録されてしまう**
    `.env.local`の値が`"https://..."`のようにダブルクォート付きだった場合、
    `dotenv`はローカル読み込み時にクォートを自動で外すため`npm run dev`は問題なく動くが、
    `grep ... | cut -d'=' -f2- | vercel env add NAME production`のように生の文字列を
    そのままVercelに渡すとクォートごと登録されてしまい、Upstashクライアントが
    `Invalid URL`エラーで落ちる(本番`/api/recipients`が500になった実例あり)。
    → Vercelに登録する前に前後のクォートを剥がす処理を挟む(下記の`strip_quotes`相当)。
    また`vercel env add name [environment] [git-branch]`は環境を1つしか位置引数に取れないため、
    `production preview`のように並べて渡すと2番目が`git-branch`として解釈され
    `branch_not_found`エラーになる。環境ごとに個別に実行すること。

12. **動的ルート(`[id]/route.ts`)にHTTPメソッドを追加すると、動いていたdevサーバーが
    そのルートだけ応答しなくなることがある**
    `src/app/api/recipients/[id]/route.ts`に`DELETE`ハンドラを追加したところ、
    同ファイルの`PATCH`も含めてリクエストがタイムアウトするまで応答しなくなった
    (他のAPIルートやページのGETは正常)。コード自体に問題はなく、Turbopackのdevサーバーが
    そのルートファイルの再コンパイルで詰まっていたとみられる。
    → `npm run dev`を再起動(Ctrl+C→再実行)したら解消。今後も動的ルートにメソッドを
    追加した直後に同様の現象が起きたら、まず再起動を試すこと。

13. **CALL-Eは日本の電話番号への英語通話をサポートしていない**(実際にクレジットを使って確認)
    `locale: "en"`で日本の番号(+81)に発信しようとすると
    `Call task creation was rejected: The phone number is recognized as Japan,
    but English is not supported for calls to Japan.` で発信自体が拒否される。
    → `src/lib/locale.ts`の`isLocaleSupportedForPhone(phone, locale)`で
    「+81の番号にはlocale="ja"以外を許可しない」をAPI(POST/PATCH `/api/recipients`)と
    ダッシュボードUI(登録・編集フォーム)の両方でチェックするようにした(2026-08-02)。
    他の国・言語の組み合わせでどこまでサポートされるかは未検証。

---

## 現在の状態(2026-08-02時点)

- ローカル環境で、発信→判定→ダッシュボード表示→(可能な場合)メール通知、まで一通り動作確認済み
- ダッシュボードに以下の機能あり:
  - 見守り対象者の登録・編集(名前・電話番号・通知先メール)
  - 対象者ごとの通話履歴一覧(判定バッジ、要約、理由)
  - 「今すぐ電話する」(単発発信)ボタン
  - 「登録済み全員に今すぐ電話する」(一括発信)ボタン ※ローカルでの動作確認済み(順次発信・各自の質問・通話履歴の記録まで正常動作)
  - 対象者の削除ボタン(通話履歴も一緒に削除)。ローカル・本番とも動作確認済み(2026-08-02)。
- 発信・判定・保存・通知のロジックは`wellness-service.ts`の`runWellnessCheck()`に一本化済み。
  単発発信API・一括発信API・Cron(未使用)の3箇所から共通で呼ばれる設計。
- **英語対応(i18n)を追加(2026-08-02、コンテスト規約でアプリ本体のデフォルト言語を英語にする
  必要があるため)**: ダッシュボードUIに言語トグル(デフォルト英語、localStorageに保存)、
  対象者ごとに通話・通知言語(`locale: "en"|"ja"`)を設定可能に。通話スクリプト・判定理由・
  メール文面をそれぞれの言語で出し分け。既存データ(Redis)は読み込み時に`locale`未設定なら
  自動で"ja"を補完(後方互換、動作確認済み)。
  → ただし13番の制約により、日本の電話番号への英語通話はCALL-E側で拒否される。
  英語での実通話は日本以外の番号でまだ未検証(クレジットの都合上、次に試す)。
- **本番デプロイ済み**: https://call-e-anpi.vercel.app (Vercel, GitHubの`main`ブランチと連携済み)。
  `/dashboard`・`/api/recipients`が200で返るのに加え、ダッシュボードから実際に発信ボタンを押す
  一連の動作(発信→判定→Redis保存→ダッシュボード表示)も、一括発信ボタンも含めて
  本番環境で確認済み(2026-08-02)。単発発信・一括発信・削除・編集・登録、すべて本番で動作確認済み。

## 未着手・今後の課題

1. **公開デモの扱い**
   - データ保存はUpstash Redis(REST API、リージョン: AWS us-east-1)。Vercel本番/Preview両方に
     環境変数設定済み、`npm run migrate:to-redis`で既存データも移行済み。詳細は下記11番参照。
   - **実データが残ったまま公開している状態**(本人の意向により現状維持、まだ手を付けていない):
     Redis上に本物の名前・電話番号・メールアドレスが2件入っている
     (旧`data/wellness-data.json`にも同じ内容が残っている)。
     公開デモとして人に見せる前には、Redis側のデータをリセットする必要がある。
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
