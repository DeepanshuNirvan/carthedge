import type { WhatsAppSignupConfig, WhatsAppSignupResult } from '@/api/messaging';

/*
 * WhatsApp Embedded Signup: Meta's own popup, driven by the Facebook JS SDK.
 * The seller creates or links their WhatsApp Business account inside it — by
 * default keeping the WhatsApp Business app on their phone (coexistence) —
 * and the popup hands back a one-time code plus the account and number ids.
 * The code is swapped for a token on the server; it is useless on its own.
 */

type FacebookSdk = {
  init: (opts: Record<string, unknown>) => void;
  login: (
    cb: (res: { authResponse?: { code?: string } | null }) => void,
    opts: Record<string, unknown>,
  ) => void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

let sdk: Promise<FacebookSdk> | null = null;

function loadSdk(appId: string, version: string): Promise<FacebookSdk> {
  sdk ||= new Promise<FacebookSdk>((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version });
      resolve(window.FB!);
    };
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => {
      sdk = null;
      reject(new Error('Could not load Meta’s signup — check your connection or ad blocker and try again.'));
    };
    document.body.appendChild(script);
  });
  return sdk;
}

const metaOrigin = /^https:\/\/([a-z0-9-]+\.)*facebook\.com$/;

export async function launchWhatsAppSignup(cfg: WhatsAppSignupConfig): Promise<WhatsAppSignupResult> {
  const FB = await loadSdk(cfg.appId, cfg.version);

  return new Promise<WhatsAppSignupResult>((resolve, reject) => {
    let code: string | undefined;
    let session: Omit<WhatsAppSignupResult, 'code'> | undefined;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      fn();
    };
    const tryResolve = () => {
      if (code && session) settle(() => resolve({ code: code!, ...session }));
    };

    // The popup posts its session info (account + number ids) separately from
    // the login callback, in either order.
    function onMessage(event: MessageEvent) {
      if (!metaOrigin.test(event.origin)) return;
      let data: { type?: string; event?: string; data?: Record<string, string> };
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (data.event === 'CANCEL') {
        settle(() => reject(new Error('WhatsApp signup was closed before it finished.')));
      } else if (data.event === 'ERROR') {
        settle(() => reject(new Error(data.data?.error_message || 'WhatsApp signup failed.')));
      } else if (data.event?.startsWith('FINISH')) {
        session = {
          wabaId: data.data?.waba_id,
          phoneNumberId: data.data?.phone_number_id,
          coexistence: data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
        };
        tryResolve();
      }
    }
    window.addEventListener('message', onMessage);

    FB.login(
      (res) => {
        code = res?.authResponse?.code ?? undefined;
        if (!code) {
          settle(() => reject(new Error('WhatsApp signup was cancelled.')));
          return;
        }
        tryResolve();
        // older popups never post session info; the server can find the
        // account from the token itself
        timer = setTimeout(() => settle(() => resolve({ code: code!, ...(session ?? {}) })), 2500);
      },
      {
        config_id: cfg.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' },
      },
    );
  });
}
