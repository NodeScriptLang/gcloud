import { GCloudClient } from './GCloudClient.js';

export class GCloudPubSub {

    constructor(readonly client: GCloudClient) {}

    async publish(topic: GCloudTopicSpec, spec: GCloudTopicPublishRequest): Promise<GCloudTopicPublishResponse> {
        const accessToken = await this.client.createAccessToken();
        const { projectId, topicName } = topic;
        const url = new URL(`https://pubsub.googleapis.com/v1/projects/${projectId}/topics/${topicName}:publish`);
        const res = await this.client.request(url.href, {
            method: 'POST',
            headers: {
                'authorization': accessToken,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                messages: spec.messages.map(msg => this.formatMessage(msg)),
            }),
        });
        return res;
    }

    private formatMessage(msg: GCloudPubSubMessage): GCloudPubSubMessage {
        return {
            attributes: msg.attributes,
            data: Buffer.from(JSON.stringify(msg.data)).toString('base64'),
        };
    }

}

export interface GCloudTopicSpec {
    projectId: string;
    topicName: string;
}

export interface GCloudTopicPublishRequest {
    messages: GCloudPubSubMessage[];
}

export interface GCloudTopicPublishResponse {
    messageIds: string[];
}

export interface GCloudPubSubMessage {
    data: any;
    attributes: Record<string, string>;
}
