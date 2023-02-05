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

export type ElementLocatorFormatter = {
  formatIdLocator: (id: string) => string;
  formatNameAndValueLocator: (name: string, value: string) => string;
  formatNameLocator: (name: string) => string;
  formatTextAndTagnameLocator: (text: string, tagname?: string) => string;
  formatXPathLocator: (xpath: string) => string;
};

export function createWDIOLocatorFormatter(): ElementLocatorFormatter {
  return {
    formatIdLocator: (id: string) => {
      return `#${id}`;
    },
    formatNameAndValueLocator: (name: string, value: string) => {
      return `//*[@name="${name}" and @value="${value}"]`;
    },
    formatNameLocator: (name: string) => {
      return `[name="${name}"]`;
    },
    formatTextAndTagnameLocator: (text: string, tagname = "") => {
      return `${tagname}*=${text}`;
    },
    formatXPathLocator: (xpath: string) => {
      return xpath;
    },
  };
}

export type ElementLocatorSource = {
  tagname: string;
  text?: string;
  xpath: string;
  attributes: { id?: string; name?: string; value?: string };
};

export interface ElementLocatorGenerator {
  generateFrom(source: ElementLocatorSource): string;
}

export class ElementLocatorGeneratorImpl implements ElementLocatorGenerator {
  constructor(
    private formatter: ElementLocatorFormatter,
    private elementInfoList: {
      tagname: string;
      text?: string;
      xpath: string;
      value?: string;
      checked?: boolean;
      attributes?: {
        [key: string]: string;
      };
    }[],
    private maxTextLength = 100
  ) {}

  public generateFrom(source: ElementLocatorSource): string {
    const locator = this.generateLocator(source);
    return locator !== ""
      ? locator
      : this.formatter.formatXPathLocator(source.xpath);
  }

  private existsIdLocator(xpath: string, id: string): boolean {
    return this.elementInfoList.some(
      (element) => element?.attributes?.id === id && element.xpath !== xpath
    );
  }

  private existsNameAndValueLocator(
    xpath: string,
    name: string,
    value: string
  ): boolean {
    return this.elementInfoList.some(
      (element) =>
        element?.attributes?.name === name &&
        element.value === value &&
        element.xpath !== xpath
    );
  }

  private existsNameLocator(xpath: string, name: string): boolean {
    return this.elementInfoList.some(
      (element) => element?.attributes?.name === name && element.xpath !== xpath
    );
  }

  private existsTextAndTagnameLocator(
    xpath: string,
    text: string,
    tagname?: string
  ): boolean {
    return this.elementInfoList.some((element) => {
      if (tagname) {
        return (
          text === this.toPartialText(element.text ?? "") &&
          tagname === element.tagname &&
          xpath !== element.xpath
        );
      }
      return (
        text === this.toPartialText(element.text ?? "") &&
        xpath !== element.xpath
      );
    });
  }

  private generateLocator(source: ElementLocatorSource) {
    const { id, name, value } = source.attributes;
    const xpath = source.xpath;

    if (id) {
      return this.existsIdLocator(xpath, id)
        ? ""
        : this.formatter.formatIdLocator(id);
    }

    if (name && value) {
      return this.existsNameAndValueLocator(xpath, name, value)
        ? ""
        : this.formatter.formatNameAndValueLocator(name, value);
    }

    if (name) {
      return this.existsNameLocator(xpath, name)
        ? ""
        : this.formatter.formatNameLocator(name);
    }

    if (source.tagname === "DIV" || !source.text) {
      return "";
    }

    const partialText = this.toPartialText(source.text);

    if (partialText.match(/<|>|\/|\s/g)) {
      return "";
    }

    return this.existsTextAndTagnameLocator(xpath, partialText, source.tagname)
      ? ""
      : this.formatter.formatTextAndTagnameLocator(
          partialText,
          source.tagname.toLowerCase()
        );
  }

  private toPartialText(text: string): string {
    return text.slice(0, this.maxTextLength).trim();
  }
}
