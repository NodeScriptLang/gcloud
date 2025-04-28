import { DeepPartial } from 'airtight';

import { GCloudClient } from './GCloudClient.js';

export class GCloudCloudRun {

    constructor(readonly client: GCloudClient) {}

    async getService(resource: GCloudServiceResource): Promise<GCloudService | null> {
        const name = this.getServiceName(resource);
        const accessToken = await this.client.createAccessToken();
        const url = new URL(`https://run.googleapis.com/v2/${name}`);
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

    async createService(resource: GCloudServiceResource, spec: GCloudServiceCreate): Promise<GCloudOperation> {
        const { projectId, location, serviceId } = resource;
        const accessToken = await this.client.createAccessToken();
        const url = new URL(`https://run.googleapis.com/v2/projects/${projectId}/locations/${location}/services`);
        url.searchParams.append('serviceId', serviceId);
        const res = await this.client.request(url.href, {
            method: 'POST',
            headers: {
                'authorization': accessToken,
                'content-type': 'application/json',
            },
            body: JSON.stringify(spec),
        });
        return res;
    }

    async updateService(resource: GCloudServiceResource, spec: DeepPartial<GCloudService>): Promise<GCloudOperation> {
        const name = this.getServiceName(resource);
        const accessToken = await this.client.createAccessToken();
        const url = new URL(`https://run.googleapis.com/v2/${name}`);
        const res = await this.client.request(url.href, {
            method: 'PATCH',
            headers: {
                'authorization': accessToken,
                'content-type': 'application/json',
            },
            body: JSON.stringify(spec),
        });
        return res;
    }

    async getOperation(name: string): Promise<GCloudOperation> {
        const accessToken = await this.client.createAccessToken();
        const url = new URL(`https://run.googleapis.com/v2/${name}`);
        const res = await this.client.request(url.href, {
            method: 'GET',
            headers: {
                'authorization': accessToken,
            },
        });
        return res;
    }

    async waitOperation(name: string, timeout = '60s'): Promise<GCloudOperation> {
        const accessToken = await this.client.createAccessToken();
        const url = new URL(`https://run.googleapis.com/v2/${name}:wait`);
        const res = await this.client.request(url.href, {
            method: 'POST',
            headers: {
                'authorization': accessToken,
            },
            body: JSON.stringify({
                timeout,
            }),
        });
        return res;
    }

    async setIamPolicy(resource: GCloudServiceResource, policy: GCloudIamPolicy) {
        const name = this.getServiceName(resource);
        const accessToken = await this.client.createAccessToken();
        const url = new URL(`https://run.googleapis.com/v2/${name}:setIamPolicy`);
        const res = await this.client.request(url.href, {
            method: 'POST',
            headers: {
                'authorization': accessToken,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                policy,
            }),
        });
        return res;
    }

    getServiceName(resource: GCloudServiceResource) {
        const { projectId, location, serviceId } = resource;
        return `projects/${projectId}/locations/${location}/services/${serviceId}`;
    }

}

export interface GCloudService {
    name: string;
    template: GCloudRevisionTemplate;
    uri: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
}

export type GCloudServiceCreate = Omit<GCloudService, 'name' | 'uri'>;

export interface GCloudServiceResource {
    projectId: string;
    location: string;
    serviceId: string;
}

export interface GCloudRevisionTemplate {
    revision?: string;
    scaling: GCloudRevisionScaling;
    timeout: string;
    serviceAccount: string;
    containers: GCloudContainer[];
    executionEnvironment: 'EXECUTION_ENVIRONMENT_GEN2';
    maxInstanceRequestConcurrency: number;
}

export interface GCloudRevisionScaling {
    minInstanceCount?: number;
    maxInstanceCount?: number;
}

export interface GCloudContainer {
    name: string;
    image: string;
    env: GCloudContainerEnv[];
    resources: {
        limits: {
            cpu: string;
            memory: string;
        };
        cpuIdle: boolean;
    };
    ports: GCloudContainerPort[];
}

export interface GCloudContainerEnv {
    name: string;
    value?: string;
    valueSource?: {
        secretKeyRef: {
            secret: string;
            version: any;
        };
    };
}

export interface GCloudContainerPort {
    name?: 'http1' | 'h2c';
    containerPort: number;
}

export interface GCloudOperation {
    name: string;
    done: boolean;
    metadata: Record<string, string>;
    error?: {
        code: string;
        message: string;
        details: any;
    };
    response?: Record<string, string>;
}

export interface GCloudIamPolicy {
    bindings: GCloudPolicyBinding[];
}

export interface GCloudPolicyBinding {
    role: string;
    members: string[];
}
