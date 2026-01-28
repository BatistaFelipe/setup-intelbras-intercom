import net from "net";
import { DefaultResponse } from "./types.js";

// testa se a porta do host está aberta
const scanPort = (
  host: string,
  port: number,
  socket_timeout: number = 1000,
): Promise<DefaultResponse> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(socket_timeout);
    try {
      socket.connect(port, host, () => {
        socket.removeAllListeners();
        socket.destroy();
        resolve({ message: `${host}:${port}`, success: true });
      });

      socket.on("error", (error: any) => {
        socket.removeAllListeners();
        socket.destroy();
        resolve({
          message: `${host}:${port} Erro: ${error.message}`,
          success: false,
        });
      });

      socket.on("timeout", () => {
        socket.removeAllListeners();
        socket.destroy();
        resolve({ message: `${host}:${port} Timeout`, success: false });
      });
    } catch (error: any) {
      resolve({
        message: error.message || "Erro desconhecido",
        success: false,
      });
    }
  });
};

// testa uma lista de portas de um host e retorna uma lista com os liberados
const scanPortList = async (
  host: string,
  startPort: number,
  endPort: number,
): Promise<DefaultResponse> => {
  const portRange = Array.from(
    { length: endPort - startPort + 1 },
    (_, i) => startPort + i,
  );

  const promises = portRange.map((port) => scanPort(host, port));
  const results = await Promise.all(promises);

  const openPorts = results.filter((r) => r.success).map((r) => r.message);

  return {
    message: JSON.stringify({ hosts: openPorts }, null, 2),
    success: true,
  };
};

export default scanPortList;
