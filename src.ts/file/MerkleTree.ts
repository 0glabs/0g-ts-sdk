import { keccak256 } from '@ethersproject/keccak256'
import { hexConcat, type BytesLike } from '@ethersproject/bytes'

export class LeafNode {
    public hash: string // hex string
    public parent: LeafNode | null = null
    public left: LeafNode | null = null
    public right: LeafNode | null = null

    constructor(hash: string) {
        this.hash = hash
    }

    // content should be a hex string
    static fromContent(content: BytesLike): LeafNode {
        return new LeafNode(keccak256(content))
    }

    static fromLeftAndRight(left: LeafNode, right: LeafNode): LeafNode {
        const node = new LeafNode(keccak256Hash(left.hash, right.hash))
        node.left = left
        node.right = right
        left.parent = node
        right.parent = node
        return node
    }

    isLeftSide(): boolean {
        return this.parent !== null && this.parent.left === this
    }
}

export enum ProofErrors {
    WRONG_FORMAT = 'invalid merkle proof format',
    ROOT_MISMATCH = 'merkle proof root mismatch',
    CONTENT_MISMATCH = 'merkle proof content mismatch',
    POSITION_MISMATCH = 'merkle proof position mismatch',
    VALIDATION_FAILURE = 'failed to validate merkle proof',
}

// Proof represents a merkle tree proof of target content, e.g. chunk or segment of file.
export class Proof {
    // Lemma is made up of 3 parts to keep consistent with zerog-rust:
    // 1. Target content hash (leaf node).
    // 2. Hashes from bottom to top of sibling nodes.
    // 3. Root hash.
    public lemma: string[] = []

    // Path contains flags to indicate that whether the corresponding node is on the left side.
    // All true for the left most leaf node, and all false for the right most leaf node.
    public path: boolean[] = []

    constructor(lemma: string[] = [], path: boolean[] = []) {
        this.lemma = lemma
        this.path = path
    }

    validateFormat(): ProofErrors | null {
        const numSiblings = this.path.length

        if (numSiblings === 0) {
            if (this.lemma.length !== 1) {
                return ProofErrors.WRONG_FORMAT
            }
            return null
        }

        if (numSiblings + 2 !== this.lemma.length) {
            return ProofErrors.WRONG_FORMAT
        }

        return null
    }

    validate(
        rootHash: string,
        content: BytesLike,
        position: number,
        numLeafNodes: number
    ): ProofErrors | null {
        const contentHash = keccak256(content)
        return this.validateHash(rootHash, contentHash, position, numLeafNodes)
    }

    validateHash(
        rootHash: string,
        contentHash: string,
        position: number,
        numLeafNodes: number
    ): ProofErrors | null {
        const formatError = this.validateFormat()
        if (formatError !== null) {
            return formatError
        }

        if (contentHash !== this.lemma[0]) {
            return ProofErrors.CONTENT_MISMATCH
        }

        if (
            this.lemma.length > 1 &&
            rootHash !== this.lemma[this.lemma.length - 1]
        ) {
            return ProofErrors.ROOT_MISMATCH
        }

        const proofPosition = this.calculateProofPosition(numLeafNodes)
        if (proofPosition !== position) {
            return ProofErrors.POSITION_MISMATCH
        }

        if (!this.validateRoot()) {
            return ProofErrors.VALIDATION_FAILURE
        }

        return null
    }

    validateRoot(): boolean {
        let hash = this.lemma[0]

        for (let i = 0; i < this.path.length; i++) {
            const isLeft = this.path[i]
            if (isLeft) {
                hash = keccak256Hash(hash, this.lemma[i + 1])
            } else {
                hash = keccak256Hash(this.lemma[i + 1], hash)
            }
        }

        return hash === this.lemma[this.lemma.length - 1]
    }

    // numLeafNodes should bigger than 0
    calculateProofPosition(numLeafNodes: number): number {
        let position = 0

        for (let i = this.path.length - 1; i >= 0; i--) {
            const leftSideDepth = Math.ceil(Math.log2(numLeafNodes))
            const leftSideLeafNodes = Math.pow(2, leftSideDepth) / 2

            const isLeft = this.path[i]
            if (isLeft) {
                numLeafNodes = leftSideLeafNodes
            } else {
                position += leftSideLeafNodes
                numLeafNodes -= leftSideLeafNodes
            }
        }

        return position
    }
}

export class MerkleTree {
    public root: LeafNode | null = null
    public leaves: LeafNode[] = []

    constructor(root: LeafNode | null = null, leaves: LeafNode[] = []) {
        this.root = root
        this.leaves = leaves
    }

    rootHash(): string | null {
        return this.root ? this.root.hash : null
    }

    proofAt(i: number): Proof {
        if (i < 0 || i >= this.leaves.length) {
            throw new Error('Index out of range')
        }

        if (this.leaves.length === 1) {
            return new Proof([this.rootHash() as string], [])
        }

        const proof = new Proof()

        // append the target leaf node hash
        proof.lemma.push(this.leaves[i].hash)

        let current = this.leaves[i]
        while (current !== this.root) {
            if (current.isLeftSide()) {
                proof.lemma.push(current.parent?.right?.hash as string)
                proof.path.push(true)
            } else {
                proof.lemma.push(current.parent?.left?.hash as string)
                proof.path.push(false)
            }

            current = current.parent as LeafNode
        }

        // append the root node hash
        proof.lemma.push(this.rootHash() as string)

        return proof
    }

    addLeaf(leafContent: BytesLike): void {
        this.leaves.push(LeafNode.fromContent(leafContent))
    }

    addLeafByHash(leafHash: string): void {
        this.leaves.push(new LeafNode(leafHash))
    }

    // build root
    build(): MerkleTree | null {
        const numLeafNodes = this.leaves.length
        if (numLeafNodes === 0) {
            return null
        }

        let queue: LeafNode[] = []

        for (let i = 0; i < numLeafNodes; i += 2) {
            // last single leaf node
            if (i === numLeafNodes - 1) {
                queue.push(this.leaves[i])
                continue
            }

            const node = LeafNode.fromLeftAndRight(
                this.leaves[i],
                this.leaves[i + 1]
            )
            queue.push(node)
        }

        while (true) {
            const numNodes = queue.length
            if (numNodes <= 1) {
                break
            }

            for (let i = 0; i < Math.floor(numNodes / 2); i++) {
                const left = queue[0]
                const right = queue[1]
                queue.splice(0, 2) // remove first two elements
                queue.push(LeafNode.fromLeftAndRight(left, right))
            }

            if (numNodes % 2 === 1) {
                const first = queue[0]
                queue.splice(0, 1) // remove first element
                queue.push(first)
            }
        }

        this.root = queue[0]

        return this
    }
}

function keccak256Hash(...hashes: string[]): string {
    return keccak256(hexConcat(hashes))
}
