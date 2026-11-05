// =====================================================================
//  Anmeldung über MSAL.js (Auth Code + PKCE, kein Client Secret)
// =====================================================================
import { CONFIG } from "./config.js";

let pca = null;
let account = null;

export async function initAuth() {
  if (CONFIG.demo) {
    account = { name: "Demo Benutzer", username: "demo.benutzer@honestis.ag" };
    return account;
  }
  pca = new msal.PublicClientApplication({
    auth: {
      clientId: CONFIG.clientId,
      authority: `https://login.microsoftonline.com/${CONFIG.tenantId}`,
      redirectUri: location.origin + location.pathname,
      postLogoutRedirectUri: location.origin + location.pathname,
      navigateToLoginRequestUrl: true
    },
    cache: { cacheLocation: "sessionStorage" }
  });
  await pca.initialize();

  const result = await pca.handleRedirectPromise();
  if (result && result.account) account = result.account;
  if (!account) account = pca.getAllAccounts()[0] || null;
  if (account) pca.setActiveAccount(account);
  return account;
}

export function login() {
  return pca.loginRedirect({ scopes: CONFIG.graphScopes, prompt: "select_account" });
}

export function logout() {
  if (CONFIG.demo) { location.href = location.pathname; return; }
  return pca.logoutRedirect({ account });
}

export function currentAccount() { return account; }

export async function getToken(scopes) {
  if (CONFIG.demo) return "demo";
  try {
    const r = await pca.acquireTokenSilent({ scopes, account });
    return r.accessToken;
  } catch (e) {
    if (e instanceof msal.InteractionRequiredAuthError) {
      await pca.acquireTokenRedirect({ scopes, account });
      return new Promise(() => {}); // Seite wird umgeleitet
    }
    throw e;
  }
}
