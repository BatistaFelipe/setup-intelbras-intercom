export interface DefaultResponse {
  message: string;
  success: boolean;
}

export interface ScanResult {
  hosts: string[];
}

export interface HostObject {
  host: string;
  sipTimeout: number;
}

export interface SipInfo {
  name: string;
  time: number;
}

export interface SetTimeoutSipResult {
  host: string;
  status: string;
}
