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
const scanPortList = (
  host: string,
  startPort: number,
  endPort: number,
): Promise<DefaultResponse> => {
  return new Promise(async (resolve) => {
    let hosts: string[] = [];

    for (let port: number = startPort; port <= endPort; port++) {
      const response: DefaultResponse = await scanPort(host, port);
      if (response.success) {
        hosts.push(response.message);
      }
    }

    resolve({
      message: JSON.stringify({ hosts: hosts }, null, 2),
      success: true,
    });
  });
};

export default scanPortList;
