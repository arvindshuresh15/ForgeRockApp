import { useState } from "react";
import { useAuth } from "react-oidc-context";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function App() {
  const auth = useAuth();
  const [apiResult, setApiResult] = useState(null);
  const [apiError, setApiError] = useState("");
  const [apiLoading, setApiLoading] = useState(false);

  async function callProtectedApi() {
    setApiLoading(true);
    setApiError("");
    setApiResult(null);

    try {
      const accessToken = auth.user?.access_token;
      if (!accessToken) {
        throw new Error("No access token is available. Sign in again.");
      }

      const response = await fetch(`${apiBaseUrl}/api/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || `API request failed (${response.status})`);
      }

      setApiResult(body);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unknown API error");
    } finally {
      setApiLoading(false);
    }
  }

  async function logout() {
    setApiResult(null);
    setApiError("");
    await auth.signoutRedirect();
  }

  if (auth.isLoading) {
    return <main className="page"><section className="panel"><p>Checking your sign-in status…</p></section></main>;
  }

  if (auth.error) {
    return (
      <main className="page">
        <section className="panel">
          <p className="eyebrow">AUTHENTICATION ERROR</p>
          <h1>We couldn't sign you in</h1>
          <p className="error">{auth.error.message}</p>
          <button onClick={() => auth.signinRedirect()}>Try again</button>
        </section>
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <main className="page">
        <section className="panel hero">
          <div className="brand-mark">ID</div>
          <p className="eyebrow">IDENTITY DEMO</p>
          <h1>ForgeRock SSO</h1>
          <p className="lead">
            Sign in through your organization's ForgeRock AM / PingAM identity provider.
          </p>
          <button className="primary" onClick={() => auth.signinRedirect()}>
            Login with ForgeRock <span aria-hidden="true">→</span>
          </button>
          <p className="hint">OIDC Authorization Code Flow with PKCE</p>
        </section>
      </main>
    );
  }

  const profile = auth.user?.profile ?? {};

  return (
    <main className="page">
      <section className="panel">
        <div className="topline">
          <div>
            <p className="eyebrow">AUTHENTICATED SESSION</p>
            <h1>Welcome{profile.name ? `, ${profile.name}` : ""}</h1>
            <p className="lead">ForgeRock authentication completed successfully.</p>
          </div>
          <div className="status"><span /> Signed in</div>
        </div>

        <div className="details">
          <div className="detail"><span>Name</span><strong>{profile.name || "Not provided"}</strong></div>
          <div className="detail"><span>Email</span><strong>{profile.email || "Not provided"}</strong></div>
          <div className="detail"><span>Subject (sub)</span><strong className="wrap">{profile.sub || "Not provided"}</strong></div>
        </div>

        <div className="actions">
          <button className="primary" onClick={callProtectedApi} disabled={apiLoading}>
            {apiLoading ? "Calling API…" : "Call protected API"}
          </button>
          <button className="secondary" onClick={logout}>Logout</button>
        </div>

        {apiError && <div className="message error">{apiError}</div>}
        {apiResult && (
          <div className="result">
            <h2>Protected API response</h2>
            <pre>{JSON.stringify(apiResult, null, 2)}</pre>
          </div>
        )}
        <p className="hint">The Node.js API validates the access-token signature, issuer, audience and expiry.</p>
      </section>
    </main>
  );
}
