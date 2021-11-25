/**
 * Copyright 2021 NTT Corporation.
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

import express from "express";
import LoggingService from "./logger/LoggingService";
import StandardLogger, { RunningMode } from "./logger/StandardLogger";
import bodyParser from "body-parser";
import {
  SettingsType,
  SettingsUtility,
} from "./accessor/test-result/SettingsUtility";
import BaseRouter from "./routes";
import { configFilePath, deviceConfigFilePath, publicDirPath } from "./common";

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

LoggingService.initialize(
  new StandardLogger(RunningMode.Debug, "./logs/latteart-repository.log")
);

SettingsUtility.loadFile(configFilePath);
SettingsUtility.loadFile(deviceConfigFilePath, SettingsType.device);

app.use(express.static(publicDirPath));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "100mb" }));

app.use("/api/v1", BaseRouter);

const port = process.env.PORT || 3002;

const server = app.listen(port, () => {
  LoggingService.info(`Listening on *:${port}`);
});
server.timeout = 1000 * 60 * 60;
