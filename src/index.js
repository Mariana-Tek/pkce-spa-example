import pkceChallenge from "pkce-challenge";
import { stringify } from "query-string";
import {
  get as getCookie,
  remove as removeCookie,
  set as setCookie,
} from "es-cookie";

const AUTH_STATE_COOKIE_NAME = "mariana-auth-state";
const AUTH_CODE_VERIFIER_COOKIE_NAME = "mariana-auth-code-verifier";

const tenantURL = "https://cousteau-r45kxk.marianatek.com/";
const clientId = "VU_wQE0McPrlLp!gVZb;nVG=8IWSEQ?9UGAFqOAa";

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

  window.location.assign(`${tenantURL}/o/authorize?${stringify(queryParams)}`);
}

function authenticate() {}

window.addEventListener("DOMContentLoaded", () => {
  const loginButton = document.getElementById("login-button");

  loginButton.addEventListener("click", handleLoginButtonClick);

  const url = new URL(location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const isAuthenticating =
    code && state && state === getCookie(AUTH_STATE_COOKIE_NAME);

  if (isAuthenticating) {
    removeCookie(AUTH_STATE_COOKIE_NAME);
    authenticate();
  }
});
