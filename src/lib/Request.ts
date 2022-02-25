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

import axios from "axios";
import fs from "fs";
import FormData from "form-data";

export type HTTPResponse = {
  status: number;
  data?: unknown;
};

export const callMultiPartApi = async (
  fileInfos: { name: string; path: string }[],
  url: string
): Promise<HTTPResponse> => {
  const formData = new FormData();
  fileInfos.forEach((fileInfo) => {
    const file = fs.createReadStream(fileInfo.path);
    formData.append(fileInfo.name, (file as unknown) as Blob);
  });
  console.log({ url });
  const result = await axios.post(url, formData, {
    headers: formData.getHeaders(),
  });

  return { status: result.status, data: result.data };
};

export const callPostApi = async (
  url: string,
  body: any
): Promise<HTTPResponse> => {
  const result = await axios.post(url, body);

  return { status: result.status, data: result.data };
};

export const callDeleteApi = async (url: string): Promise<HTTPResponse> => {
  const result = await axios.delete(url);

  return { status: result.status, data: result.data };
};

export const downloadZip = async (url: string): Promise<unknown> => {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: { Accept: "application/zip" },
  });
  if (response.status === 404) {
    throw Error(`Not found.: ${url}`);
  }

  return response.data;
};
