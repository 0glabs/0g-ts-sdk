import { HttpProvider } from 'open-jsonrpc-provider';
import { ethers } from 'ethers';
import { IpLocation, ShardedNodes } from './types.js';
import { ShardedNode } from '../common/index.js';
import { UploadOption, Uploader } from '../transfer/index.js';
import { StorageNode } from '../node/index.js';
import { ZgFile } from '../file/index.js';
import { RetryOpts } from '../types.js';
export declare class Indexer extends HttpProvider {
    blockchain_rpc: string;
    private_key: string;
    flow_contract: string;
    upload_option?: UploadOption;
    constructor(url: string, blockchain_rpc: string, private_key: string, flow_contract: string, upload_option?: UploadOption);
    getShardedNodes(): Promise<ShardedNodes>;
    getNodeLocations(): Promise<Map<string, IpLocation>>;
    getFileLocations(rootHash: string): Promise<ShardedNode[]>;
    newUploaderFromIndexerNodes(expectedReplica: number): Promise<[Uploader | null, Error | null]>;
    selectNodes(expectedReplica: number): Promise<[StorageNode[], Error | null]>;
    upload(file: ZgFile, tag: ethers.BytesLike, segIndex?: number, opts?: UploadOption, retryOpts?: RetryOpts): Promise<[string, Error | null]>;
    download(rootHash: string, filePath: string, proof: boolean): Promise<Error | null>;
}
//# sourceMappingURL=Indexer.d.ts.map