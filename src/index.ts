import path from "node:path";
import { scanPortList } from "./services/scan-ports.js";
import hikvision from "./services/hikvision.js";
import intelbras from "./services/intelbras.js";
import {
  readHostsFile,
  UnknownError,
  log,
  validateHost,
  validatePortRange,
  getRequiredEnv,
} from "./utils.js";
import {
  runGetConfig,
  runSetConfig,
  runSetAutoMaintainReboot,
} from "./orchestrator.js";
import { queryCondominium } from "./inventory/query.js";
import { Command } from "commander";
import { FileData } from "./types.js";

const program = new Command();

program.option("-d, --dst-host <string>", "set destination host");
program.option("-r, --read-file", "read hosts from file ./data/hosts.json");
program.option("-a, --auto-reboot", "set auto reboot in Intelbras devices");
program.option("-i, --info", "query device inventory for the target host(s)");

program.parse(process.argv);
const options = program.opts();

(async () => {
  let hosts: string[] = [
    options.dstHost || process.env.DST_HOST || "localhost",
  ];
  if (options.readFile) {
    const dataFile = await readHostsFile(path.resolve("data", "hosts.json"));
    if (!dataFile.success) {
      log.error(`Failed to read hosts file: ${dataFile.message}`);
      process.exit(1);
    }
    const parsed: FileData = JSON.parse(dataFile.message);
    if (!Array.isArray(parsed.hosts)) {
      log.error("Invalid hosts file: missing 'hosts' array");
      process.exit(1);
    }
    hosts = parsed.hosts.map((h) => (typeof h === "string" ? h : h.host));
  }

  for (const host of hosts) {
    validateHost(host);
  }

  const startPort = Number(process.env.START_PORT || 8084);
  const endPort = Number(process.env.END_PORT || 8099);
  validatePortRange(startPort, endPort);

  try {
    if (options.info) {
      const credentials = {
        intelbras: {
          user: getRequiredEnv("INTELBRAS_USER"),
          password: getRequiredEnv("INTELBRAS_PWD"),
        },
        hikvision: {
          user: getRequiredEnv("HIKVISION_USER"),
          password: getRequiredEnv("HIKVISION_PWD"),
        },
      };

      for (const address of hosts) {
        const inventory = await queryCondominium({
          host: address,
          startPort,
          endPort,
          credentials,
        });
        console.log(JSON.stringify(inventory, null, 2));
      }
      return;
    }

    for (const address of hosts) {
      const scanResult = await scanPortList(address, startPort, endPort);
      const { hosts: openPorts } = JSON.parse(scanResult.message) as {
        hosts: string[];
      };
      log.info(
        `SCAN_PORTS ${address}: Found ${openPorts.length} open port(s)`,
      );

      // Hikvision
      const hikvisionConfigs = await runGetConfig(
        hikvision,
        address,
        openPorts,
      );
      await runSetConfig(hikvision, address, hikvisionConfigs);

      // Intelbras
      const intelbrasConfigs = await runGetConfig(
        intelbras,
        address,
        openPorts,
      );
      await runSetConfig(intelbras, address, intelbrasConfigs);

      if (options.autoReboot) {
        await runSetAutoMaintainReboot(intelbras, address, intelbrasConfigs);
      }
    }
  } catch (error: unknown) {
    const customError = new UnknownError(error);
    log.error(customError.toJSON());
  }
})();
