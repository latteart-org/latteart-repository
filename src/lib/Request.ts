import axios from "axios";
import fs from "fs";
import FormData from "form-data";

export const callMultiPartApi = async (
  fileInfos: { name: string; path: string }[],
  url: string
): Promise<any> => {
  const formData = new FormData();
  fileInfos.forEach((fileInfo) => {
    const file = fs.createReadStream(fileInfo.path);
    formData.append(fileInfo.name, (file as unknown) as Blob);
  });
  console.log({ url });
  const result = await axios.post(url, formData, {
    headers: formData.getHeaders(),
  });
  return result;
};

export const callPostApi = async (url: string, body: any): Promise<any> => {
  return await axios.post(url, body);
};

export const callDeleteApi = async (url: string): Promise<any> => {
  return await axios.delete(url);
};

export const downloadZip = async (
  url: string,
  filePath: string
): Promise<void> => {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: { Accept: "application/zip" },
  });
  if (response.status === 404) {
    throw Error(`Not found.: ${url}`);
  }
  return new Promise((resolve) => {
    fs.writeFile(filePath, response.data, () => {
      resolve();
    });
  });
};
