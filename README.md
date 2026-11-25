# ja-reports-and-docs

Claude Code で日本語の報告や文書を出力させる際に使用する skill です。
Claude からの報告・出力された日本語の文章を自然な形に修正します。

README、commit メッセージ、調査報告等の出力時に使用する想定としています。

## 修正の例

| 修正する点 | 修正前 | 修正後 |
|---|---|---|
| 読み手に必要な情報だけにする | 初回の同期には数分かかります。同期中はアプリを閉じず、ノート PC のふたも閉じないでください。スリープに入るとネットワークが切れるので、同期が途中で止まります。 | 初回の同期には数分かかります。終わるまで PC を開いたままにしてください。 |
| 書き手の事情を読み手に必要な情報にする | 作者の環境は macOS 14 と Node.js 20 | macOS 14 と Node.js 20 の組み合わせで動作を確認している |
| 意味の広い語を狭い語にする | サーバーを立てて設定を入れる | サーバーを起動して設定を反映する |

## 動作

README や commit メッセージを書かせると、Claude Code がこの skill を自動で読み込みます。README、手順書、PR の説明では、書き終えた後にサブエージェントを 3 つ起動して作業を分担させます。

- 不要な文を削る
- 初見の読み手として読んで確認する
- 語順と読点を点検する

サブエージェント 1 つにつき 20〜60 秒かかるので、3 つ合わせて 1〜3 分ほど応答が遅くなります。

## インストール

Claude Code のセッションで次の 1 行を実行してください。

```
/plugin install ja-reports-and-docs --marketplace Hiest-mountain/ja-reports-and-docs
```

Claude Code が 2.1.275 より古い場合は、次の 2 行を順に実行します。

```
/plugin marketplace add Hiest-mountain/ja-reports-and-docs
/plugin install ja-reports-and-docs@ja-reports-and-docs
```

`/reload-plugins` を実行するか Claude Code を起動し直すと、skill の一覧に `ja-reports-and-docs:ja-reports-and-docs` が表示されます。更新は `/plugin marketplace update ja-reports-and-docs` で受け取れます。使用をやめる場合は `/plugin uninstall ja-reports-and-docs` を実行してください。

この skill が自動で読み込まれないことがある場合は、`~/.claude/CLAUDE.md` に次の 1 行を追加してください。

```
調査結果の報告、まとまった説明、まとめ資料、README、commit、PR、手順書を書くときは `ja-reports-and-docs` skill に従う。
```
