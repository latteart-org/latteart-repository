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

export enum ServerErrorCode {
  SAVE_PROJECT_FAILED = "save_project_failed",
  GET_PROJECT_FAILED = "get_project_failed",
  GET_SETTINGS_FAILED = "get_settings_failed",
  SAVE_SETTINGS_FAILED = "save_settings_failed",
  GET_DEVICE_SETTINGS_FAILED = "get_device_settings_failed",
  SAVE_DEVICE_SETTINGS_FAILED = "save_device_settings_failed",
  SAVE_TEST_SCRIPT_FAILED = "save_test_script_failed",
  SAVE_SNAPSHOT_FAILED = "save_snapshot_failed",
  CREATE_TEST_RESULT_FAILED = "save_test_result_failed",
  GET_TEST_RESULT_FAILED = "get_test_result_failed",
  ADD_TEST_STEP_FAILED = "add_test_step_failed",
  GET_TEST_STEP_FAILED = "get_test_step_failed",
  EDIT_TEST_STEP_FAILED = "edit_test_step_failed",
  ADD_NOTE_FAILED = "add_note_failed",
  GET_NOTE_FAILED = "get_note_failed",
  EDIT_NOTE_FAILED = "edit_note_failed",
  DELETE_NOTE_FAILED = "delete_note_failed",
  COMPRESS_NOTE_IMAGE_FAILED = "compress_note_image_failed",
  COMPRESS_TEST_STEP_IMAGE_FAILED = "compress_test_step_image_failed",
  UPDATE_TEST_RESULT_FAILED = "update_test_result_failed",
  DELETE_TEST_RESULT_FAILED = "delete_test_result_failed",
  PATCH_SESSION_FAILED = "patch_session_failed",
  GET_SESSION_FAILED = "get_session_failed",
  GET_SERVERNAME_FAILED = "get_servername_failed",
  EXPORT_TEST_RESULT_FAILED = "export_test_result_failed",
  IMPORT_TEST_RESULT_FAILED = "import_test_result_failed",
  EXPORT_PROJECT_FAILED = "export_project_failed",
  IMPORT_PROJECT_FAILED = "import_project_failed",
  IMPORT_PROJECT_NOT_EXIST = "import_project_not_exist",
  IMPORT_TEST_RESULT_NOT_EXIST = "import_test_result_not_exist",
  FILE_UPLOAD_REQUEST_FAILED = "upload_request_failed",
  TEMP_DELETE_FAILED = "delete_temp_file_failed",
}

export interface ServerErrorData {
  code: ServerErrorCode;
  message?: string;
  details?: Array<{
    code: string;
    message: string;
    target: string;
  }>;
}

export class ServerError extends Error {
  constructor(public statusCode: number, public data?: ServerErrorData) {
    super(data?.message ?? "");
  }
}
