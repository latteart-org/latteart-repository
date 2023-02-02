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

import { PageObjectElement } from "./PageObjectOperation";
import { TestScriptSourceElement } from "../../../../TestScriptSourceOperation";
import { IdentifierGenerator } from "@/lib/scriptGenerator/IdentifierGenerator";
import { TestScriptGenerationOption } from "@/lib/scriptGenerator/TestScriptGenerator";

export interface PageObjectElementFactory {
  createFrom(
    element: TestScriptSourceElement | null,
    imageUrl: string,
    identifierGenerator: IdentifierGenerator
  ): PageObjectElement;
}

export class PageObjectElementFactoryImpl implements PageObjectElementFactory {
  constructor(
    private option: Pick<TestScriptGenerationOption, "buttonDefinitions"> = {
      buttonDefinitions: [
        { tagname: "INPUT", elementType: "submit" },
        { tagname: "INPUT", elementType: "button" },
        { tagname: "A" },
        { tagname: "BUTTON" },
      ],
    }
  ) {}

  public createFrom(
    element: TestScriptSourceElement | null,
    imageUrl: string,
    identifierGenerator: IdentifierGenerator
  ): PageObjectElement {
    if (!element) {
      return {
        identifier: "",
        type: "Other",
        value: "",
        name: "",
        locator: "",
        imageUrl,
      };
    }
    const identifier =
      identifierGenerator.generateIdentifierFromElement(element);

    return {
      identifier,
      type: this.createElementType(element.tagname, element.attributes.type),
      value: element.attributes.value ?? "",
      name: element.attributes.name ?? "",
      locator: element.locator,
      imageUrl,
    };
  }

  private createElementType(tagname: string, elementType = "") {
    if (tagname === "INPUT" && elementType === "radio") {
      return "RadioButton";
    }

    if (tagname === "INPUT" && elementType === "checkbox") {
      return "CheckBox";
    }

    if (tagname === "SELECT") {
      return "SelectBox";
    }

    const isButton = this.option.buttonDefinitions.some((d) => {
      if (d.tagname.toUpperCase() !== tagname) {
        return false;
      }

      if (!d.elementType) {
        return true;
      }

      return d.elementType === elementType;
    });

    if (isButton) {
      return "Button";
    }

    return "Other";
  }
}
