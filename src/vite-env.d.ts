/// <reference types="vite/client" />

interface Window {
  hackos?: {
    platform: string;
    versions: {
      electron?: string;
      chrome?: string;
      node?: string;
    };
    closeApp?: () => void;
    selectFolder?: () => Promise<string | null>;
  };
}
