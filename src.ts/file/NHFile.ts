import { open, FileHandle } from 'node:fs/promises'
import { Iterator, NodeFdIterator } from './Iterator/index.js'
import { AbstractFile } from './AbstractFile.js'

export class NHFile extends AbstractFile {
    fd: FileHandle | null = null
    fileSize: number = 0

    constructor(fd: FileHandle, fileSize: number) {
        super()
        this.fd = fd
        this.fileSize = fileSize
    }

    static async fromNodeFileHandle(fd: FileHandle): Promise<NHFile> {
        const stat = await fd.stat()
        return new NHFile(fd, stat.size)
    }

    // NOTE: need manually close fd after use
    static async fromFilePath(path: string): Promise<NHFile> {
        const fd = await open(path, 'r') // if fail, throw error
        return await NHFile.fromNodeFileHandle(fd)
    }

    async close(): Promise<void> {
        await this.fd?.close()
    }

    iterateWithOffsetAndBatch(
        offset: number,
        batch: number,
        flowPadding: boolean
    ): Iterator {
        return new NodeFdIterator(
            this.fd as FileHandle,
            this.size(),
            offset,
            batch,
            flowPadding
        )
    }
}
