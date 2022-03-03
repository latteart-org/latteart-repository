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

import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { TestMatrixEntity } from "./TestMatrixEntity";

@Entity("PROGRESS_DATAS")
export class ProgressDataEntity {
  @ManyToOne(() => TestMatrixEntity, (testMatrix) => testMatrix.progressDatas, {
    primary: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "test_matrix_id" })
  testMatrix!: TestMatrixEntity;

  @PrimaryColumn({ name: "date" })
  date!: string;

  @Column({ name: "text" })
  text!: string;

  constructor(props: ProgressDataEntity) {
    Object.assign(this, props);
  }
}
