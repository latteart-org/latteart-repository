# latteart-repository パッケージの開発

## 環境のセットアップ

開発に必要な以下ソフトウェアを開発環境にインストールします。

- Git
- Node.js v16.13.2
- Yarn

全てのインストールが完了したら、`latteart-repository`リポジトリを clone し、以下を実行します。

```bash
$ cd latteart-repository
$ yarn install
$ yarn typescript-json-validator src/lib/settings/Settings.ts
```

## 開発用コマンド

```bash
# 静的解析、自動修正
$ yarn fix

# テストの実行
$ yarn test

# ソースコードの変更検知、再ビルド
$ yarn watch

# ビルド済サーバの起動(port:3002)
$ node dist/index.js
```

## パッケージのビルド

```bash
$ yarn package
```

`dist`ディレクトリ配下に以下構成のディレクトリが作成されます。

```bash
dist/
  └─ latteart/
      └─ latteart-repository/
          ├─ latteart-repository.exe # Windows用実行ファイル
          ├─ latteart-repository # Mac用実行ファイル
          └─ latteart.config.json # 設定ファイル
```

## API ドキュメント

- [REST API リファレンス](https://latteart-org.github.io/latteart-repository/)
