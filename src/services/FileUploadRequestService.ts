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

import { callMultiPartApi, callPostApi } from "@/lib/Request";

export class FileUploadRequestService {
  constructor(private destRepositoryUrl: string) {}

  public async upload(targetFile: {
    name: string;
    path: string;
  }): Promise<string[]> {
    const result = await callMultiPartApi(
      [targetFile],
      `${this.destRepositoryUrl}/api/v1/upload`
    );

    const urls = result.data as string[];

    return urls.map((url) => `${this.destRepositoryUrl}/${url}`);
  }

  public async testResultImportRequest(
    source: { testResultFileUrl: string },
    dest?: { testResultId?: string }
  ): Promise<{ testResultId: string }> {
    const res = await callPostApi(
      `${this.destRepositoryUrl}/api/v1/imports/test-results`,
      {
        source,
        dest,
      }
    );

    return res.data as { testResultId: string };
  }
}
