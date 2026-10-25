import type { WhatsAppSignup } from '@/api/messaging';

type LoginResponse = { authResponse?: { code?: string } | null };

declare global {
  interface Window {
    FB?: {
      init: (options: Record<string, unknown>) => void;
      login: (callback: (res: LoginResponse) => void, options: Record<string, unknown>) => void;
    };
  }
}

let sdk: Promise<void> | null = null;

/** Loads and initialises the Facebook SDK once. Settings calls it on mount, so
 *  the click that opens Meta's popup can open it straight away: a popup opened
 *  after an await is blocked by the browser. */
export function loadFacebook(s: WhatsAppSignup) {
  if (window.FB) return Promise.resolve();
  sdk ||= new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = 'https://connect.facebook.net/en_US/sdk.js';
    el.async = true;
    el.crossOrigin = 'anonymous';
    el.onload = () => {
      window.FB!.init({ appId: s.appId, version: s.version, xfbml: false, autoLogAppEvents: false });
      resolve();
    };
    el.onerror = () => {
      sdk = null;
      reject(new Error('Could not load Meta’s signup. Check your connection and try again.'));
    };
    document.body.appendChild(el);
  });
  return sdk;
}

const fromFacebook = (origin: string) => {
  const host = new URL(origin).hostname;
  return host === 'facebook.com' || host.endsWith('.facebook.com');
};

/** Runs Meta's WhatsApp Embedded Signup (v4) and resolves with the code the
 *  server exchanges. partner attaches CartHedge's partner solution, which is
 *  what makes CartHedge, not the seller, pay Meta. */
export async function whatsappSignup(s: WhatsAppSignup, partner: boolean) {
  await loadFacebook(s);
  return new Promise<string>((resolve, reject) => {
    let failure = '';
    // Meta reports a failed step only through this message, never the callback
    const onMessage = (e: MessageEvent) => {
      if (!fromFacebook(e.origin)) return;
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d?.type === 'WA_EMBEDDED_SIGNUP' && d.event === 'ERROR') failure = d.data?.error_message ?? '';
      } catch {
        // the SDK posts other, non-JSON messages on the same channel
      }
    };
    window.addEventListener('message', onMessage);
    window.FB!.login(
      (res) => {
        window.removeEventListener('message', onMessage);
        const code = res.authResponse?.code;
        if (code) resolve(code);
        else reject(new Error(failure || 'The WhatsApp signup was closed before it finished.'));
      },
      {
        config_id: s.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: partner ? { solutionID: s.solutionId } : {},
          // sellers keep their number on the WhatsApp Business app (coexistence)
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      },
    );
  });
}
