import { OverloadApi } from '../preload';

declare global {
  interface Window {
    overloadApi: OverloadApi;
  }
}

export {};