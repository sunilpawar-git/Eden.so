/**
 * Google Identity Services (GIS) Type Declarations
 * Provides TypeScript types for the GIS SDK loaded via script tag.
 * Only the authorization code client API is typed (what we use).
 */

interface CodeClientConfig {
    client_id: string;
    scope: string;
    ux_mode?: 'popup' | 'redirect';
    redirect_uri?: string;
    callback: (response: CodeResponse) => void;
    error_callback?: (error: { type: string; message: string }) => void;
}

interface CodeResponse {
    code: string;
    scope: string;
}

interface CodeClient {
    requestCode: () => void;
}

interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message: string }) => void;
}

interface TokenResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    error?: string;
    error_description?: string;
}

interface TokenClient {
    requestAccessToken: (options?: { prompt?: string }) => void;
}

interface GoogleAccountsOAuth2 {
    initCodeClient: (config: CodeClientConfig) => CodeClient;
    initTokenClient: (config: TokenClientConfig) => TokenClient;
    revoke: (token: string, callback?: () => void) => void;
}

interface GoogleAccounts {
    oauth2: GoogleAccountsOAuth2;
}

interface GoogleGlobal {
    accounts: GoogleAccounts;
}

declare global {
    interface Window {
        google?: GoogleGlobal;
    }
}

export { };
