import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import App from "./App.jsx";
import "./styles.css";

const authority = import.meta.env.VITE_OIDC_AUTHORITY;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID;
const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI;
const postLogoutRedirectUri =
  import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI ||
  window.location.origin + "/";

if (!authority || !clientId || !redirectUri) {
  throw new Error(
    "Missing OIDC settings. Copy .env.example to .env and configure the values."
  );
}

const oidcConfig = {
  authority,
  client_id: clientId,
  redirect_uri: redirectUri,
  post_logout_redirect_uri: postLogoutRedirectUri,
  response_type: "code",
  scope: "openid profile email",
  loadUserInfo: true,
  extraHeaders: {
    "ngrok-skip-browser-warning": "1"
  },
  automaticSilentRenew: false,
  onSigninCallback: () => {
    // Remove OIDC response parameters from the address bar after callback processing.
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider {...oidcConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
