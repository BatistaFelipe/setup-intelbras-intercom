import { readFile } from "fs/promises";
import "dotenv/config";
import { request } from "urllib";
import {
  ScanResult,
  HostObject,
  SipInfo,
  DefaultResponse,
  SetTimeoutSipResult,
} from "./types.js";

// Intelbras API https://intelbras-caco-api.intelbras.com.br/
let options = {
  headers: { "Content-type": "text/plain;charset=utf-8" },
  digestAuth: `${process.env.INTELBRAS_USER}:${process.env.INTELBRAS_PWD}`,
};

const parseIntelbrasResponse = (text: string) => {
  const [label, value] = text.split("=");
  const cleanLabel = label.replace(/\./g, "");
  return { name: cleanLabel, time: Number(value) };
};

const getConfigSip = async (filename: string): Promise<DefaultResponse> => {
  return new Promise(async (resolve) => {
    try {
      let hosts: HostObject[] = [];

      const fileData: string = await readFile(filename, "utf-8");
      const obj: ScanResult = JSON.parse(fileData);

      for (const host of obj.hosts) {
        const url: string = `http://${host}/cgi-bin/configManager.cgi?action=getConfig&name=SIP.RegExpiration`;
        options["method"] = "GET";
        const { data, res } = await request(url, options);

        if (res.status !== 200)
          throw new Error(`Erro (GET): ${host} - ${res.status}`);

        const dataString: string = data.toString();
        if (!dataString)
          throw new Error(`Erro (DATA): ${host} - ${res.status}`);
        const sipInfo: SipInfo = parseIntelbrasResponse(dataString);
        if (sipInfo.time) {
          const hostObj: HostObject = { host: host, sipTimeout: sipInfo.time };
          hosts.push(hostObj);
        }
      }
      resolve({
        message: JSON.stringify({ hosts: hosts }, null, 2),
        success: true,
      });
    } catch (error) {
      resolve({
        message: error.message || "Erro desconhecido",
        success: false,
      });
    }
  });
};

const setTimeoutSip = async (filename: string): Promise<DefaultResponse> => {
  return new Promise(async (resolve) => {
    try {
      let results: SetTimeoutSipResult[] = [];

      const fileData: string = await readFile(filename, "utf-8");
      const obj: ScanResult = JSON.parse(fileData);

      for (const host of obj.hosts) {
        if (host["sipTimeout"] > 60) {
          const address: string = host["host"];
          const url: string = `http://${address}/cgi-bin/configManager.cgi?action=setConfig&SIP.RegExpiration=60`;
          options["method"] = "GET";
          const { data, res } = await request(url, options);

          if (res.status !== 200)
            throw new Error(`Erro (GET): ${address} - ${res.status}`);

          const dataString: string = data.toString();
          if (!dataString)
            throw new Error(`Erro (DATA): ${address} - ${res.status}`);

          const objResult: SetTimeoutSipResult = {
            host: address,
            status: dataString,
          };
          results.push(objResult);
        }
      }
      resolve({
        message: JSON.stringify({ result: results }, null, 2),
        success: true,
      });
    } catch (error) {
      resolve({
        message: error.message || "Erro desconhecido",
        success: false,
      });
    }
  });
};

export default { getConfigSip, setTimeoutSip };
