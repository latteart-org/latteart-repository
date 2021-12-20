# LatteArt Repository

LatteArt Repository is a service that stores test information for LatteArt.

- 日本語版は[README_ja.md](/README_ja.md)を参照して下さい。

## Project Setup

1. Install `node.js v12.18.1`.
1. Install `yarn` corresponding to the version of node.js.
1. Go to the root directory of the project.
1. Execute the following command.

   ```bash
   yarn install
   ```

## Build

### Ready to build

1. Put `history-viewer` and `snapshot-viewer` directories into the root directory of the project.
   ```bash
   latteart-repository
       ├─ history-viewer # put
       └─ snapshot-viewer # put
   ```

### How to build

1. Go to the root directory of the project.
1. Execute the following command to create validators.
   ```bash
   yarn typescript-json-validator src/lib/settings/Settings.ts
   yarn typescript-json-validator src/lib/settings/DeviceSettings.ts
   ```
1. Execute the following command.
   ```bash
   yarn package
   ```
1. The following directories and files are created in `dist/latteart-repository`.
   ```bash
   dist/latteart-repository
       ├─ latteart-repository.exe # for Windows
       ├─ latteart-repository # for Mac
       ├─ latteart.config.json # config file
       ├─ latteart.device.config.json # device config file
       ├─ history-viewer
       └─ snapshot-viewer
   ```

## Watch (for developer)

Detect the source code changes and rebuild LatteArt Repository.

1. Go to the root directory of the project.
1. Execute the following command to create validators.
   ```bash
   yarn typescript-json-validator src/lib/settings/Settings.ts
   yarn typescript-json-validator src/lib/settings/DeviceSettings.ts
   ```
1. Execute the following command.
   ```bash
   yarn watch
   ```
1. The directory `dist` is created in the current directory, and `dist` contains built `index.js`. (If you update the source code, it is rebuilt automatically.)

## Run

### How to use

1. Execute the `latteart-repository.exe` or `latteart-repository`.
1. The local server will stand up and wait at `http://127.0.0.1:3002`.

## License

This software is licensed under the Apache License, Version2.0.
