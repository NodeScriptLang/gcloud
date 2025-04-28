import { ServerError } from '@nodescript/errors';
import jsonwebtoken from 'jsonwebtoken';

import { GCloudCloudRun } from './GCloudCloudRun.js';
import { GCloudPubSub } from './GCloudPubSub.js';
import { GCloudSecrets } from './GCloudSecrets.js';
import { GCloudStorage } from './GCloudStorage.js';
import { parseJson } from './util.js';

export const GCP_SCOPES = {
    CLOUD_PLATFORM: 'https://www.googleapis.com/auth/cloud-platform',
};

/**
 * Provides access to a variety of Google Cloud API endpoints.
 *
 * At some point consider extracting API-specific stuff.
 */
export class GCloudClient {

    private tokenCacheByScope = new Map<string, string>();

    credentials: GCloudCredentials;

    storage = new GCloudStorage(this);
    pubSub = new GCloudPubSub(this);
    cloudRun = new GCloudCloudRun(this);
    secrets = new GCloudSecrets(this);

    constructor(credentials: GCloudCredentials | string) {
        const json: any = typeof credentials === 'string' ? parseJson(credentials, {}) : credentials;
        if (!json.private_key || !json.client_email) {
            throw new ServerError('GCloud Credentials must be in JSON format and contain private_key and client_email');
        }
        this.credentials = json;
    }

    async createAccessToken(scope: string = GCP_SCOPES.CLOUD_PLATFORM) {
        const existing = this.tokenCacheByScope.get(scope);
        if (existing) {
            return existing;
        }
        const jwt = jsonwebtoken.sign({
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000 + 30 * 60),
            scope,
        }, this.credentials.private_key, {
            algorithm: 'RS256',
            audience: 'https://oauth2.googleapis.com/token',
            issuer: this.credentials.client_email,
        });
        const res = await this.request('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion': jwt,
            }),
        });
        const token = 'Bearer ' + res.access_token;
        // Cache the token and expire it after specified timeout
        this.tokenCacheByScope.set(scope, token);
        const expiresIn = Number(res.expires_in) || 3600;
        setTimeout(() => this.tokenCacheByScope.delete(scope), expiresIn * 1000 * 0.75).unref();
        return token;
    }

    async request(url: string, options: RequestInit) {
        const res = await fetch(url, options);
        if (!res.ok) {
            const responseText = await res.text();
            const details = parseJson<any>(responseText, { responseText });
            throw new GCloudError(res.status, {
                method: options.method ?? 'GET',
                url,
                ...details,
            });
        }
        return await res.json();
    }

}

export class GCloudError extends Error {

    override name = this.constructor.name;

    constructor(readonly status: number, readonly details: any = {}) {
        super(`GCloud Request Failed: ${status}`);
    }

}

export interface GCloudCredentials {
    client_email: string;
    private_key: string;
}
