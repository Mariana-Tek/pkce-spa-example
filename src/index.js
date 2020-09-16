/**
 * The goal of this example is to provide an example of handling authentication
 * with Mariana Tek via the Authorization Code Flow w/ PKCE that is as generic
 * as possible. We have focused on utilizing only packages that help with
 * brevity of code as well as helping to avoid the pitfalls of small details
 * (e.g. acceptable characters for a code challenge's random string).
 *
 * ## Sources:
 * - https://auth0.com/docs/flows/concepts/auth-code-pkce
 * - https://oauth.net/2/pkce/
 */

// handles generation of code challenge and verifier pairs
import pkceChallenge from "pkce-challenge";

// handles formatting URLs and requests related to the Authorization Code Flow
// it also accepts extra arguments which help us enable PKCE
import ClientOAuth2 from "client-oauth2";

// we use cookies for the code challenge as it is easy to set an expiration
// but you could use other methods
import {
  get as getCookie,
  remove as removeCookie,
  set as setCookie,
} from "es-cookie";

// these are global names for storage utilized by a variety of functions
const AUTH_STATE_COOKIE_NAME = "mariana-auth-state";
const AUTH_CODE_VERIFIER_COOKIE_NAME = "mariana-auth-code-verifier";
const AUTH_SESSION_NAME = "mariana-auth-session";

/**
 * here we initialize the utility used for our authorization flow. you will need
 * to update the `clientId`, `accessTokenUri`, and `authorizationUri` values
 * to match your tenant.
 */

const marianaAuth = new ClientOAuth2({
  clientId: "O7NS6vs8ET2UUUcheTgUFVDex8j6JAb6zzOeymkw",
  accessTokenUri: "https://demo-n9c5fm.marianatek.com/o/token/",
  authorizationUri: "https://demo-n9c5fm.marianatek.com/o/authorize",
  redirectUri: window.location.origin,
  scopes: ["read:account"],
});

/**
 * this function handles clicking the login button. it initializes the state,
 * code challenge, and accompanying cookies as well as redirecting to the auth
 */
function handleLoginButtonClick() {
  const { code_challenge, code_verifier } = pkceChallenge();

  // we're hijacking the `pkceChallenge` package here to generate a random
  // string, any random string that can be easily sanitized for a URI will
  // do
  const { code_challenge: stateString } = pkceChallenge();

  // we don't want these to live forever
  setCookie(AUTH_STATE_COOKIE_NAME, stateString, { expires: 1 });
  setCookie(AUTH_CODE_VERIFIER_COOKIE_NAME, code_verifier, { expires: 1 });

  const redirectUri = marianaAuth.code.getUri({
    state: stateString,

    // these extra values power the PKCE part of the flow
    query: {
      code_challenge: code_challenge,
      code_challenge_method: "S256",
    },
  });

  window.location.assign(redirectUri);
}

/**
 * logging out is simple, just remove the stored session
 */
function handleLogoutButtonClick() {
  localStorage.removeItem(AUTH_SESSION_NAME);
  document.getElementById('name').remove();
  toggleButtonDisabling();
}

/**
 * this function handles authentication by requesting a token, clearing the
 * remaining challenge cookies, and storing our session data
 *
 * @param {string} url
 * @param {string} code
 */
async function authenticate(url, code) {
  // uses `client-oauth2`'s `getToken` method, passing in extra PKCE related values
  // to the `body` key
  const token = await marianaAuth.code.getToken(url, {
    body: {
      grant_type: "authorization_code",
      code,
      code_verifier: getCookie(AUTH_CODE_VERIFIER_COOKIE_NAME),
    },
  });

  // removing the code verifier so it can not be used again
  removeCookie(AUTH_CODE_VERIFIER_COOKIE_NAME);

  // convert the `expires` date object value to unix timestamp so it can be easily stored
  // and merge it with the rest of the token data
  const sessionData = {
    ...token.data,
    expired_at: token.expires.getTime(),
  };

  // store session data
  localStorage.setItem(AUTH_SESSION_NAME, JSON.stringify(sessionData));
}

/**
 * simple function to check authenticated state. if you are using a SPA
 * framework there should be a package to handle this for you.
 */
function isAuthenticated() {
  const sessionData = JSON.parse(localStorage.getItem(AUTH_SESSION_NAME));

  return !!sessionData && !!sessionData.access_token;
}

/**
 * an example of a request. this is not needed for authentication.
 */
async function getSelf() {
  const { access_token } = JSON.parse(localStorage.getItem(AUTH_SESSION_NAME));

  // add the access token to the `Authorization` header to make requests
  const res = await fetch(
    "https://demo-n9c5fm.marianatek.com/api/users/self",
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  );

  // destructure what we actually need. why all of the nesting?
  // https://jsonapi.org/
  const {
    data: { attributes: user },
  } = await res.json();

  return user;
}

/**
 * helper to toggle disabled state of login and logout buttons in example.
 * this is not needed for authentication.
 */
function toggleButtonDisabling() {
  const isDisabled = isAuthenticated();

  document.getElementById("login-button").disabled = isDisabled;
  document.getElementById("logout-button").disabled = !isDisabled;
}

/**
 * This section contains what would align with the "initialization" step of
 * your components.
 *
 * In React, think the `componentDidMount` step or a function passed
 * as the initial state of a `useState` hook.
 *
 * `mounted` in Vue, `init` in Ember...
 *
 * There are three distinct sections:
 *
 * 1. setting up interaction
 * 2. checking whether we are currently attempting to authenticate
 * 3. checking whether we are currently authenticated
 *
 * In a more typical SPA this would be broken up by component or route.
 */
window.addEventListener("DOMContentLoaded", async () => {
  // 0. Go straight to login flow?
  const url = new URL(location.href);
  const login = url.searchParams.get("login");

  if (login) {
    return handleLoginButtonClick();
  }

  // 1. Interaction
  // setting up events to power interactions
  const loginButton = document.getElementById("login-button");
  const logoutButton = document.getElementById("logout-button");

  loginButton.addEventListener("click", handleLoginButtonClick);
  logoutButton.addEventListener("click", handleLogoutButtonClick);

  toggleButtonDisabling();

  // 2. Are we attempting to authenticate?
  // this section establishes whether we are currently authenticating
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // is code present AND is state present AND does state match?
  const isAuthenticating =
    code && state && state === getCookie(AUTH_STATE_COOKIE_NAME);

  // remove so state can not be used again
  removeCookie(AUTH_STATE_COOKIE_NAME);

  if (isAuthenticating) {
    // if we're authenticating run the authenticate function...
    await authenticate(url, code);

    // ...and clear the query string
    history.pushState({}, document.title, window.location.origin);
  }

  // 2. Are we authenticated?
  // if we're authenticated, do something about it!
  if (isAuthenticated()) {
    const self = await getSelf();

    // simple example executing code in an authenticated state with data
    // from the server
    const app = document.getElementById("app");
    const nameHeader = document.createElement("H1");
    nameHeader.setAttribute('id', 'name');
    const nameText = document.createTextNode(`Welcome ${self.first_name}`);
    nameHeader.appendChild(nameText);
    app.appendChild(nameHeader);

    toggleButtonDisabling();
  }
});
