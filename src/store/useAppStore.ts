interface AppState {
  settings: {
    autoConnect: boolean;
    killSwitch: boolean;
    dnsLeakProtection: boolean;
    startWithWindows: boolean;
    autoUpdate: boolean;
  };
  setSetting: (key: string, value: boolean) => void;
}