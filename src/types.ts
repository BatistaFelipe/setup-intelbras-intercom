export interface DefaultResponse {
  message: string;
  success: boolean;
}

export interface HostConfig {
  host: string;
  extension?: number;
  sipTimeout?: number;
}

export interface ScanResult {
  hosts: (string | HostConfig)[]; // Aceita tanto string quanto o objeto
}

export interface SetTimeoutSipResult {
  host: string;
  data: string;
  status_code: number;
}

export interface SipService {
  getConfigSip(filename: string): Promise<DefaultResponse>;
  setTimeoutSip(filename: string): Promise<DefaultResponse>;
}
