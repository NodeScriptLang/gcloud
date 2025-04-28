import { GCloudClient } from './GCloudClient.js';

export class GCloudSecrets {

    constructor(readonly client: GCloudClient) {}

    async getSecret(projectId: string, secretId: string): Promise<GCloudSecret | null> {
        const accessToken = await this.client.createAccessToken();
        const url = new URL(`https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretId}`);
        try {
            const res = await this.client.request(url.href, {
                method: 'GET',
                headers: {
                    'authorization': accessToken,
                    'content-type': 'application/json',
                },
            });
            return res;
        } catch (error: any) {
            if (error.status === 404) {
                return null;
            }
            throw error;
        }
    }

    async createSecret(projectId: string, secretId: string, spec: GCloudSecretCreate): Promise<GCloudSecret> {
        const accessToken = await this.client.createAccessToken();
        const url = new URL(`https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets`);
        url.searchParams.append('secretId', secretId);
        const res = await this.client.request(url.href, {
            method: 'POST',
            headers: {
                'authorization': accessToken,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                ...spec,
                replication: {
                    automatic: {},
                },
            }),
        });
        return res;
    }

    async listSecretVersions(projectId: string, secretId: string): Promise<GCloudSecretVersion[]> {
        const accessToken = await this.client.createAccessToken();
        const url = new URL(`https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretId}/versions`);
        const res = await this.client.request(url.href, {
            method: 'GET',
            headers: {
                'authorization': accessToken,
                'content-type': 'application/json',
            },
        });
        return res.versions ?? [];
    }

    async createSecretVersion(projectId: string, secretId: string, data: string): Promise<GCloudSecretVersion> {
        const accessToken = await this.client.createAccessToken();
        const url = new URL(`https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretId}:addVersion`);
        const res = await this.client.request(url.href, {
            method: 'POST',
            headers: {
                'authorization': accessToken,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                payload: {
                    data: Buffer.from(data, 'utf-8').toString('base64'),
                },
            }),
        });
        return res;
    }

    async accessSecretVersion(versionName: string): Promise<string> {
        const accessToken = await this.client.createAccessToken();
        const url = new URL(`https://secretmanager.googleapis.com/v1/${versionName}:access`);
        const res = await this.client.request(url.href, {
            method: 'GET',
            headers: {
                'authorization': accessToken,
                'content-type': 'application/json',
            },
        });
        const data = res.payload?.data ?? '';
        return Buffer.from(data, 'base64').toString('utf-8');
    }

}

export interface GCloudSecret {
    name: string;
    annotations: Record<string, string>;
}

export interface GCloudSecretCreate {
    annotations: Record<string, string>;
}

export interface GCloudSecretVersion {
    name: string;
    state: 'ENABLED' | 'DISABLED' | 'DESTROYED';
}
