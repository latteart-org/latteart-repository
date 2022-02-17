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

import { CreateFileUploadRequestDto } from "../interfaces/FileUploadRequest";
import { callMultiPartApi, callDeleteApi, callPostApi } from "@/lib/Request";

export class FileUploadRequestService {
  public async upload(requestBody: CreateFileUploadRequestDto): Promise<any> {
    const result = await callMultiPartApi(
      [requestBody.file].map((file) => {
        return {
          name: file.name,
          path: "public/" + file.path,
        };
      }),
      `${requestBody.url}/api/v1/upload`
    );
    return result;
  }

  public async importRequest(
    fileName: string,
    url: string,
    testResultId: string | undefined
  ): Promise<any> {
    return await callPostApi(`${url}/api/v1/imports/test-results`, {
      fileName,
      testResultId,
      temp: true,
    });
  }

  public async deleteUploadedFile(
    domain: string,
    fileName: string
  ): Promise<void> {
    await callDeleteApi(`${domain}/api/v1/temp/${fileName}`);
  }
}
