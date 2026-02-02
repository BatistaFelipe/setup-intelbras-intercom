import fs from "fs/promises";
import path from "node:path";
import scanPortList from "./services/scan-ports.js";
import Hikvision from "./services/hikvision.js";
import Intelbras from "./services/intelbras.js";
import { log, UnknownError } from "./utils.js";
import { DefaultResponse, SetTimeoutSipResult, SipService } from "./types.js";
import { Command } from "commander";

const program = new Command();

program.option("-d, --dst-host <string>", "Destination host");
program.parse(process.argv);
const options = program.opts();

const HOST: string = options.dstHost || process.env.DST_HOST;
const START_PORT: number = Number(process.env.START_PORT || 8084);
const END_PORT: number = Number(process.env.END_PORT || 8099);
const SCAN_PORTS_FILE: string = path.resolve("data", "scan-ports.json");
const DATAFILE_HIKVISION: string = path.resolve("data", "hikvision.json");
const DATAFILE_INTELBRAS: string = path.resolve("data", "intelbras.json");

const saveToFile = async (filename: string, data: string) => {
  try {
    await fs.writeFile(filename, data, "utf-8");
    return { message: "Arquivo salvo com sucesso", success: true };
  } catch (error: unknown) {
    const customError = new UnknownError(error);
    return customError.toJSON();
  }
};

async function runScanList() {
  // faz o scan de portas e salva no arquivo json somente os liberados
  const scanList: DefaultResponse = await scanPortList(
    HOST,
    START_PORT,
    END_PORT,
  );
  const statusSave = await saveToFile(SCAN_PORTS_FILE, scanList.message);
  if (!statusSave.success) {
    log.error(
      `❌ ${SCAN_PORTS_FILE} ${HOST}: Erro ao salvar arquivo!\n${statusSave.message}`,
    );
    return;
  }
  log.info(`✅ ${SCAN_PORTS_FILE} ${HOST}: Arquivo salvo com sucesso!`);
}

async function runGetConfig(object: SipService, filename: string) {
  const timeoutSipList: DefaultResponse =
    await object.getConfigSip(SCAN_PORTS_FILE);
  if (!timeoutSipList.success) {
    log.error(
      `❌ ${HOST}: Erro ao buscar SIP.RegExpiration! - ${timeoutSipList.message}`,
    );
    return;
  }
  const statusSave = await saveToFile(filename, timeoutSipList.message);
  if (!statusSave.success) {
    log.error(
      `❌ ${filename} ${HOST}: Erro ao salvar arquivo!\n${statusSave.message}`,
    );
    return;
  }
  log.info(`✅ ${filename} ${HOST}: Arquivo salvo com sucesso!`);
}

async function runSetConfig(object: SipService, filename: string) {
  const setTimeoutSip: DefaultResponse = await object.setTimeoutSip(filename);
  if (!setTimeoutSip.success) {
    log.error(
      `❌ SET_TIMEOUT_SIP ${HOST}: Erro ao configurar dispositivo!\n${setTimeoutSip.message}`,
    );
    return;
  }
  try {
    const data = JSON.parse(setTimeoutSip.message);
    const results: SetTimeoutSipResult[] = data.result || [];

    for (const item of results) {
      log.info(
        `✅ SET_TIMEOUT_SIP - host: ${item.host} status: ${item.status_code}`,
      );
    }
  } catch (error) {
    log.error(
      `❌ SET_TIMEOUT_SIP - Erro: ${error.message || "Erro desconhecido"}`,
    );
  }
}

(async () => {
  await runScanList();
  await runGetConfig(Hikvision, DATAFILE_HIKVISION);
  await runSetConfig(Hikvision, DATAFILE_HIKVISION);

  await runGetConfig(Intelbras, DATAFILE_INTELBRAS);
  await runSetConfig(Intelbras, DATAFILE_INTELBRAS);
})();
