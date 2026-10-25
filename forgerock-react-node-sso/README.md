# ForgeRock AM / PingAM + React + Node.js SSO demo

This repository is a development starter for:
- React + Vite frontend using OIDC Authorization Code Flow with PKCE
- ForgeRock AM / PingAM as the OpenID Provider
- Express API validating signed JWT access tokens using AM's JWKS

> Configure and test against your own AM tenant. URLs, issuer, audience, scopes, signing algorithm, claims, and logout behavior vary by AM version and tenant configuration. This demo assumes JWT access tokens signed with RS256. If your AM issues opaque access tokens, use server-side token introspection instead.

## Requirements
- Node.js 20+ recommended
- A running ForgeRock AM / PingAM instance with an OAuth 2.0 client configured
- npm

## 1. Configure ForgeRock AM

Create an OAuth 2.0 client in the intended realm.

Suggested local-development settings:
- Client ID: `react-sso-app`
- Client type: Public
- Grant: Authorization Code
- Response type: `code`
- Token endpoint authentication: `none`
- Redirect URI: `http://localhost:5173/callback`
- Post-logout redirect URI: `http://localhost:5173/`
- JavaScript origin: `http://localhost:5173`
- Scopes: `openid profile email`

Use PKCE. Do not configure a client secret in React.

Configure an authentication journey and test it independently. Configure AM to issue JWT access tokens for your API and include the audience configured below. The API expects `aud` to contain `my-protected-api` and `iss` to match the configured issuer exactly. Configure AM to issue RS256 tokens or update `JWT_ALGORITHMS` in the API to the algorithm actually used.

### Discovery / issuer

Open your AM discovery URL in a browser. Typical URL for a top-level realm:

`https://am.example.com/am/oauth2/realms/root/.well-known/openid-configuration`

For a subrealm, for example `customers`:

`https://am.example.com/am/oauth2/realms/root/realms/customers/.well-known/openid-configuration`

Use the exact `issuer` returned in discovery as `VITE_OIDC_AUTHORITY` and `AM_ISSUER` below. Do not assume the issuer equals the discovery URL.

## 2. Configure frontend

```bash
cd frontend
cp .env.example .env
npm install
```

Edit `.env` and set:
- `VITE_OIDC_AUTHORITY`: exact `issuer` value from AM discovery
- `VITE_OIDC_CLIENT_ID`: client ID configured in AM
- `VITE_OIDC_REDIRECT_URI`: registered callback URI
- `VITE_API_URL`: API base URL

All `VITE_` variables are public and bundled into the browser. Never place secrets in them.

## 3. Configure backend

In another terminal:

```bash
cd backend
cp .env.example .env
npm install
```

Edit `.env`:
- `AM_ISSUER`: exact issuer from AM discovery
- `API_AUDIENCE`: audience AM places in the access token
- `FRONTEND_ORIGIN`: exact frontend origin
- `JWT_ALGORITHMS`: comma-separated list of allowed algorithms, default `RS256`

The API downloads the OIDC discovery document and uses the advertised `jwks_uri` to validate signatures. It checks signature, issuer, audience, and expiry. It does not treat an ID token as an API token.

If AM issues opaque access tokens, replace JWT validation with authenticated server-side introspection.

## 4. Run

Terminal 1:
```bash
cd backend
npm run dev
```

Terminal 2:
```bash
cd frontend
npm run dev
```

Open http://localhost:5173.

## 5. Test

- `GET http://localhost:4000/health` should return `{"status":"ok"}`.
- `GET http://localhost:4000/api/me` without a bearer token should return 401.
- Click **Login with ForgeRock**, authenticate, and return to the app.
- Click **Call protected API**. It should return the verified token's subject, issuer, and audience.
- Test logout. AM's end-session behavior depends on the configured client and deployment.

## Troubleshooting

- `redirect_uri_mismatch`: ensure the callback URI matches AM exactly.
- Discovery errors: verify deployment context path, realm path, TLS certificate, and exact issuer.
- API 401: confirm access token is a JWT; check issuer, audience, signing algorithm, expiry, and JWKS.
- CORS: set `FRONTEND_ORIGIN` and AM JavaScript origin correctly.
- Empty profile: confirm scopes and AM claim mappings.

## Security notes

This is a local development sample, not a production-ready security architecture. For production:
- Use HTTPS and trusted TLS certificates.
- Consider a backend-for-frontend (BFF) with server-managed sessions for higher-security applications.
- Do not store long-lived tokens in localStorage.
- Apply authorization rules in the API, not just in React.
- Keep dependencies updated and configure rate limits, logging, and error handling.
- Avoid returning raw token values to the browser console or logs.


### Forgerock Config
1. Application Config
Realm > OAuth2.0 > Clients > Add Client

2. Trees
Authn. > Trees > Create Tree
Realm > OAuth2.0 > Clients > Select Client > Advance > Tree Name

3. Servers & Site
Deployment > Create Server > Create Site

4. CORS
Configure > Global Services > CORS Service >Configuration > Secondary Configuration (Add Cors)

5. OAuth Script
Realm > Script > OIDC Claim Script

6. Select OAuth Script
Realm > Services > Oauth2 Provider > Right Hard Drop Down > Plugins > OIDC Claim Script

## 7. /am/Logback.jsp [Critical]
To set the log level

8. Configure API in Forerock
Realm > Script > New Script > OAuth 2.0 Access Token Modification

9. Realm > Core > Services > Oauth2 Provider > Enable “Use Client Side Access & Refresh Token” > Enable Issue Refresh Token > Switch Tab to Advanced > OAuth 2.0 Signing Algo - based on what app accepts (we selected ES 256) > Right Hard Drop Down > Plugins > Access Token Modification Script [which we made]

10. Realm > OAuth2.0 > Clients > Select Client > Set Access & Refresh Token Lifetime


### Leasson:
1. Your AM is 8.0.1. Ping’s requirements say AM 8.0.1 supports Java 17 and Java 21; Java 25 support starts with AM 8.0.2. So this is a Java runtime compatibility issue, not an error in the claims script itself. My earlier focus on script contents was a false lead.
