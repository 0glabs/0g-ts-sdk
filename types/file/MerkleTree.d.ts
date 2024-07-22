import { type BytesLike } from '@ethersproject/bytes';
export declare class LeafNode {
    hash: string;
    parent: LeafNode | null;
    left: LeafNode | null;
    right: LeafNode | null;
    constructor(hash: string);
    static fromContent(content: BytesLike): LeafNode;
    static fromLeftAndRight(left: LeafNode, right: LeafNode): LeafNode;
    isLeftSide(): boolean;
}
export declare enum ProofErrors {
    WRONG_FORMAT = "invalid merkle proof format",
    ROOT_MISMATCH = "merkle proof root mismatch",
    CONTENT_MISMATCH = "merkle proof content mismatch",
    POSITION_MISMATCH = "merkle proof position mismatch",
    VALIDATION_FAILURE = "failed to validate merkle proof"
}
export declare class Proof {
    lemma: string[];
    path: boolean[];
    constructor(lemma?: string[], path?: boolean[]);
    validateFormat(): ProofErrors | null;
    validate(rootHash: string, content: BytesLike, position: number, numLeafNodes: number): ProofErrors | null;
    validateHash(rootHash: string, contentHash: string, position: number, numLeafNodes: number): ProofErrors | null;
    validateRoot(): boolean;
    calculateProofPosition(numLeafNodes: number): number;
}
export declare class MerkleTree {
    root: LeafNode | null;
    leaves: LeafNode[];
    constructor(root?: LeafNode | null, leaves?: LeafNode[]);
    rootHash(): string | null;
    proofAt(i: number): Proof;
    addLeaf(leafContent: BytesLike): void;
    addLeafByHash(leafHash: string): void;
    build(): MerkleTree | null;
}
//# sourceMappingURL=MerkleTree.d.ts.map