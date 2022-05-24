# LatteArt Repository

LatteArt で利用するテスト情報を保存するサービスです。

## プロジェクトセットアップ

1. `node.js v14.15.3`をインストールします。
1. 上記バージョンの node.js に対応した`yarn`をインストールします。
1. ソースコードのルートディレクトリに移動します。
1. 以下コマンドを実行します。

   ```bash
   yarn install
   ```

## ビルド

### 事前準備

1. LatteArt(GUI 側)でビルドした以下 2 点をソースコードのルートディレクトリに配置します。
   ```bash
   latteart-repository
       ├─ history-viewer # 配置
       └─ snapshot-viewer # 配置
   ```

### 手順

1. ソースコードのルートディレクトリに移動します。
1. 以下コマンドを実行し、バリデータを生成します。
   ```bash
   yarn typescript-json-validator src/lib/settings/Settings.ts
   yarn typescript-json-validator src/lib/settings/DeviceSettings.ts
   ```
1. 以下コマンドを実行します。
   ```bash
   yarn package
   ```
1. `dist/latteart-repository`に以下構成のディレクトリが作成されます。
   ```bash
   dist/latteart-repository
       ├─ latteart-repository.exe # Windows用実行ファイル
       ├─ latteart-repository # Mac用実行ファイル
       ├─ latteart.config.json # 設定ファイル
       ├─ latteart.device.config.json # デバイス設定ファイル
       ├─ history-viewer # スナップショット(履歴画面)ビューア
       └─ snapshot-viewer # スナップショットビューア
   ```

## ウォッチ(開発用)

ソースコードの変更を検知して再ビルドします。

1. ソースコードのルートディレクトリに移動します。
1. 以下コマンドを実行し、バリデータを生成します。
   ```bash
   yarn typescript-json-validator src/lib/settings/Settings.ts
   yarn typescript-json-validator src/lib/settings/DeviceSettings.ts
   ```
1. 以下コマンドを実行します。
   ```bash
   yarn watch
   ```
1. カレントディレクトリに`dist`ディレクトリが作成され、配下にビルドされた`index.js`が出力されます(以降ソースコードを修正すると自動的に再ビルドされます)。

## 起動

### 手順

1. ビルドで出力された実行ファイルをダブルクリック等で実行します。
1. ローカルサーバが立ち上がり、`http://127.0.0.1:3002`で待ち受けます。

## License

This software is licensed under the Apache License, Version2.0.
