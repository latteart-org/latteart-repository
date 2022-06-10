/**
 * Copyright 2022 NTT Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import "reflect-metadata";

import express, {
  Response as ExResponse,
  Request as ExRequest,
  NextFunction,
} from "express";
import { ValidateError } from "tsoa";
import LoggingService from "./logger/LoggingService";
import StandardLogger, { RunningMode } from "./logger/StandardLogger";
import bodyParser from "body-parser";
import { SettingsType, SettingsUtility } from "./lib/settings/SettingsUtility";
import {
  appRootPath,
  configFilePath,
  deviceConfigFilePath,
  publicDirPath,
} from "./common";
import { createConnection, getConnectionOptions } from "typeorm";
import { NoteEntity } from "./entities/NoteEntity";
import { TagEntity } from "./entities/TagEntity";
import fs from "fs-extra";
import path from "path";
import { RegisterRoutes } from "./routes/routes";
import { TestStepEntity } from "./entities/TestStepEntity";
import { DefaultInputElementEntity } from "./entities/DefaultInputElementEntity";
import { CoverageSourceEntity } from "./entities/CoverageSourceEntity";
import { TestPurposeEntity } from "./entities/TestPurposeEntity";
import { TestResultEntity } from "./entities/TestResultEntity";
import { ScreenshotEntity } from "./entities/ScreenshotEntity";
import { StaticDirectoryServiceImpl } from "./services/StaticDirectoryService";
import { AttachedFileEntity } from "./entities/AttachedFilesEntity";
import { ConfigEntity } from "./entities/ConfigEntity";
import { ProgressDataEntity } from "./entities/ProgressDataEntity";
import { ProjectEntity } from "./entities/ProjectEntity";
import { SessionEntity } from "./entities/SessionEntity";
import { SnapshotEntity } from "./entities/SnapshotEntity";
import { StoryEntity } from "./entities/StoryEntity";
import { TestMatrixEntity } from "./entities/TestMatrixEntity";
import { TestTargetEntity } from "./entities/TestTargetEntity";
import { TestTargetGroupEntity } from "./entities/TestTargetGroupEntity";
import { ViewPointEntity } from "./entities/ViewPointEntity";
import { ViewPointPresetEntity } from "./entities/ViewPointPresetEntity";
import { ServerError } from "./ServerError";
import { TransactionRunner } from "./TransactionRunner";
import { Init1638930268191 } from "./migrations/1638930268191-Init";
import { UpdateProjectEntity1641956149882 } from "./migrations/1641956149882-UpdateProjectEntity";
import { UpdateAttachedFilesEntity1642388104855 } from "./migrations/1642388104855-UpdateAttachedFilesEntity";
import { UpdateViewPointEntity1654749340817 } from "./migrations/1654749340817-UpdateViewPointEntity";

LoggingService.initialize(
  new StandardLogger(
    RunningMode.Debug,
    path.join(appRootPath, "logs", "latteart-repository.log")
  )
);

export const screenshotDirectoryService = new StaticDirectoryServiceImpl(
  publicDirPath,
  "screenshots"
);
export const attachedFileDirectoryService = new StaticDirectoryServiceImpl(
  publicDirPath,
  "attached-files"
);
export const snapshotDirectoryService = new StaticDirectoryServiceImpl(
  publicDirPath,
  "snapshots"
);
export const testScriptDirectoryService = new StaticDirectoryServiceImpl(
  publicDirPath,
  "test-scripts"
);
export const importDirectoryService = new StaticDirectoryServiceImpl(
  publicDirPath,
  "imports"
);
export const exportDirectoryService = new StaticDirectoryServiceImpl(
  publicDirPath,
  "exports"
);

export const tempDirectoryService = new StaticDirectoryServiceImpl(
  publicDirPath,
  "temp"
);

export const transactionRunner = new TransactionRunner();

(async () => {
  SettingsUtility.loadFile(configFilePath);
  SettingsUtility.loadFile(deviceConfigFilePath, SettingsType.device);

  const ormConnectionName = "default";

  await initializeOrmConnection(ormConnectionName);

  const envPort = parseInt(process.env.PORT ?? "");
  const port = Number.isNaN(envPort) ? 3002 : envPort;

  const timeout = 1000 * 60 * 60;

  runServer(port, timeout);
})().catch((error) => {
  LoggingService.error(error);
});

async function initializeOrmConnection(connectionName: string) {
  const baseOptions = await getConnectionOptions(connectionName);

  const options = {
    ...baseOptions,
    entities: [
      CoverageSourceEntity,
      DefaultInputElementEntity,
      NoteEntity,
      ScreenshotEntity,
      TagEntity,
      TestPurposeEntity,
      TestResultEntity,
      TestStepEntity,
      AttachedFileEntity,
      ConfigEntity,
      ProgressDataEntity,
      ProjectEntity,
      SessionEntity,
      SnapshotEntity,
      StoryEntity,
      TestMatrixEntity,
      TestTargetEntity,
      TestTargetGroupEntity,
      ViewPointEntity,
      ViewPointPresetEntity,
    ],
    migrations: [
      Init1638930268191,
      UpdateProjectEntity1641956149882,
      UpdateAttachedFilesEntity1642388104855,
      UpdateViewPointEntity1654749340817,
    ],
  };

  if (baseOptions.type === "sqlite") {
    const databaseName = `${baseOptions.database}`;
    const databasePath = path.join(__dirname, databaseName);

    const backupDatabaseName = `${baseOptions.database}.bak`;
    const backupDatabasePath = path.join(__dirname, backupDatabaseName);

    if (fs.existsSync(databasePath)) {
      LoggingService.info(
        `Backup sqlite database file. -> ${backupDatabasePath}`
      );

      await fs.copyFile(databasePath, backupDatabasePath);
    }
  }

  const connection = await createConnection(options);

  await connection.runMigrations().catch(async (error) => {
    LoggingService.error(error);

    await connection.close();

    throw new Error(`Migration failed.`);
  });
}

function runServer(port: number, timeout?: number) {
  const app = express();

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-Requested-With,content-type"
    );

    next();
  });

  app.use(express.static(publicDirPath));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json({ limit: "100mb" }));

  // app.use("/api/v1", BaseRouter);

  RegisterRoutes(app);

  app.use(function errorHandler(
    err: unknown,
    req: ExRequest,
    res: ExResponse,
    next: NextFunction
  ): ExResponse | void {
    console.log("errorHandler");

    if (err instanceof ValidateError) {
      LoggingService.warn(
        `Caught Validation Error for ${req.path}: ${JSON.stringify(err.fields)}`
      );
      LoggingService.warn(req.body);

      return res.status(422).json({
        message: "Validation Failed",
        details: err?.fields,
      });
    } else if (err instanceof ServerError) {
      LoggingService.error(JSON.stringify(err));

      return res.status(err.statusCode).json(err.data);
    } else if (err instanceof Error) {
      LoggingService.error(JSON.stringify(err));

      return res.status(500).json({
        message: "Internal Server Error",
      });
    } else {
      LoggingService.error(`${err}`);
    }

    next();
  });

  const server = app.listen(port, () => {
    LoggingService.info(`Listening on *:${port}`);
  });

  if (timeout) {
    server.timeout = timeout;
  }
}
