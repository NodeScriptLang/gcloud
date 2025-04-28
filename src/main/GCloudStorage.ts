import { GCloudClient } from './GCloudClient.js';

export class GCloudStorage {

    constructor(readonly client: GCloudClient) {}

    async uploadFile(spec: GCloudStorageUploadSpec) {
        const accessToken = await this.client.createAccessToken();
        const url = new URL(`https://storage.googleapis.com/upload/storage/v1/b/${spec.bucket}/o`);
        url.searchParams.append('name', spec.filename);
        await this.client.request(url.href, {
            method: 'POST',
            headers: {
                'authorization': accessToken,
                'content-type': spec.contentType,
            },
            body: spec.content,
        });
        return {
            publicUrl: `https://storage.googleapis.com/${spec.bucket}/${spec.filename}`,
        };
    }

}

export interface GCloudStorageUploadSpec {
    bucket: string;
    filename: string;
    content: string | Buffer;
    contentType: string;
}
