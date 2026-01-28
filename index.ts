import fs from "fs/promises";
import path from "node:path";
import scanPortList from "./scan-ports.js";
import Intelbras from "./intelbras.js";
import { DefaultResponse, SetTimeoutSipResult } from "./types.js";

const HOST: string = "localhost";
const START_PORT: number = 8084;
const END_PORT: number = 8099;
const SCAN_PORTS_FILE: string = path.resolve("data", "scan-ports.json");
const DATA_API_FILE: string = path.resolve("data", "intelbras.json");

const saveToFile = async (filename: string, data: any) => {
  try {
    await fs.writeFile(filename, data, "utf-8");
    return { message: "Arquivo salvo com sucesso", success: true };
  } catch (error: any) {
    return {
      message: error.message || "Erro ao salvar arquivo",
      success: true,
    };
  }
};

(async () => {
  // faz o scan de portas e salva no arquivo json somente os liberados
  const scanList: DefaultResponse = await scanPortList(
    HOST,
    START_PORT,
    END_PORT,
  );
  let statusSave = await saveToFile(SCAN_PORTS_FILE, scanList.message);
  if (!statusSave.success) {
    console.log(
      `❌ ${SCAN_PORTS_FILE} ${HOST}: Erro ao salvar arquivo!\n${statusSave.message}`,
    );
    return;
  }
  console.log(`✅ ${SCAN_PORTS_FILE} ${HOST}: Arquivo salvo com sucesso!`);

  // lê todos que tem acesso e busca o registro de table.SIP.RegExpiration
  const timeoutSipList: DefaultResponse =
    await Intelbras.getConfigSip(SCAN_PORTS_FILE);
  statusSave = await saveToFile(DATA_API_FILE, timeoutSipList.message);
  if (!statusSave.success) {
    console.log(
      `❌ ${DATA_API_FILE} ${HOST}: Erro ao salvar arquivo!\n${statusSave.message}`,
    );
    return;
  }
  console.log(`✅ ${DATA_API_FILE} ${HOST}: Arquivo salvo com sucesso!`);

  const setTimeoutSip: DefaultResponse =
    await Intelbras.setTimeoutSip(DATA_API_FILE);
  if (!setTimeoutSip.success) {
    console.log(
      `❌ SET_TIMEOUT_SIP ${HOST}: Erro ao configurar dispositivo!\n${setTimeoutSip.message}`,
    );
    return;
  }
  try {
    const objResult: SetTimeoutSipResult[] = JSON.parse(setTimeoutSip.message);
    for (const result of objResult["result"]) {
      console.log(
        `✅ SET_TIMEOUT_SIP - host: ${result.host} status: ${result.status}`,
      );
    }
  } catch (error) {
    console.log(
      `❌ SET_TIMEOUT_SIP - Erro: ${error.message || "Erro desconhecido"}`,
    );
  }
})();
