/**
 * Host transport for the game bundle running inside the WebView (native) or a sandboxed
 * iframe (web preview). Only raw strings cross this boundary; validation happens in the
 * controller via the shared protocol schemas.
 */
export interface HostTransport {
  post(json: string): void;
  onMessage(handler: (raw: unknown) => void): void;
}

interface NativeWebViewWindow extends Window {
  ReactNativeWebView?: { postMessage(message: string): void };
  __campusRallyReceive?: (json: string) => void;
}

export function createHostTransport(): HostTransport {
  const w = window as NativeWebViewWindow;
  const native = w.ReactNativeWebView;
  let handler: (raw: unknown) => void = () => undefined;

  // Native: React Native calls window.__campusRallyReceive(json) via injectJavaScript.
  w.__campusRallyReceive = (json: string) => handler(json);
  // Web preview: the parent page posts strings to this sandboxed iframe.
  if (!native) {
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      handler(event.data);
    });
  }

  return {
    post(json: string) {
      if (native) native.postMessage(json);
      else if (window.parent !== window) window.parent.postMessage(json, '*');
    },
    onMessage(next) {
      handler = next;
    },
  };
}
