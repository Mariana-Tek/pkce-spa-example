import pkceChallenge from "pkce-challenge";
import { stringify } from "query-string";
import {
  get as getCookie,
  remove as removeCookie,
  set as setCookie,
} from "es-cookie";
// import ClientOAuth2 from "client-oauth2";

const AUTH_STATE_COOKIE_NAME = "mariana-auth-state";
const AUTH_CODE_VERIFIER_COOKIE_NAME = "mariana-auth-code-verifier";

// const marianaAuth = new ClientOAuth2({
//   clientId: "O7NS6vs8ET2UUUcheTgUFVDex8j6JAb6zzOeymkw",
//   accessTokenUri: "https://cousteau-r45kxk.marianatek.com/o/token/",
//   authorizationUri: "https://cousteau-r45kxk.marianatek.com/o/authorize",
//   redirectUri: "https://cousteau-r45kxk.marianatek.com/admin/auth",
// });

export const createRandomString = () => {
  const charset =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_~.";
  return Array.from(window.crypto.getRandomValues(new Uint8Array(43)))
    .map((v) => charset[v % charset.length])
    .join("");
};

export const urlEncodeB64 = (input) => {
  const b64Chars = { "+": "-", "/": "_", "=": "" };
  return input.replace(/[+/=]/g, (m) => b64Chars[m]);
};

/**
 * TO-DO:
 *
 * 2. code for callback
 */

function handleLoginButtonClick(e) {
  const { code_challenge, code_verifier } = pkceChallenge();
  const stateString = createRandomString();

  const queryParams = {
    client_id: clientId,
    code_challenge: urlEncodeB64(code_challenge),
    code_challenge_method: "S256",
    prompt: "true",
    redirect_uri: window.self.origin,
    response_type: "code",
    scope: "read:account",
    state: stateString,
  };

  setCookie(AUTH_STATE_COOKIE_NAME, stateString, { expires: 1 });
  setCookie(AUTH_CODE_VERIFIER_COOKIE_NAME, code_verifier, { expires: 1 });

  window.location.assign(
    `${marianaAuth.code.getUri()}?${stringify(queryParams)}`
  );
}

function authenticate() {}

window.addEventListener("DOMContentLoaded", async () => {
  const loginButton = document.getElementById("login-button");

  loginButton.addEventListener("click", handleLoginButtonClick);

  const url = new URL(location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const isAuthenticating =
    code && state && state === getCookie(AUTH_STATE_COOKIE_NAME);

  if (isAuthenticating) {
    const token = marianaAuth.code.getToken(req.originalUrl);
    debugger;
    // removeCookie(AUTH_STATE_COOKIE_NAME);
    // authenticate();

    // https://cousteau-r45kxk.marianatek.com/o/token/
    //
    // Form data:
    //
    // grant_type: authorization_code
    // code: NXSFy5KE0jXqP3nzjKP4tHckLqj8Xa
    // code_verifier: CSS2Dd5TUiNlFBWTQaVonJX02EAIkfM9i4UJZTYCFk.
    // client_id: XFXS2z0riR3kT5t1EXd1QhkCUsW4y089watvrUNl
    // redirect_uri: https://cousteau-r45kxk.marianatek.com/admin/auth
  }
});
