import { Iterator, BlobIterator } from './Iterator/index.js'
import { AbstractFile } from './AbstractFile.js'

export class Blob extends AbstractFile {
    blob: File | null = null // @see https://developer.mozilla.org/en-US/docs/Web/API/File/File
    fileSize: number = 0

    constructor(blob: File) {
        super()
        this.blob = blob
        this.fileSize = blob.size
    }

    iterateWithOffsetAndBatch(
        offset: number,
        batch: number,
        flowPadding: boolean
    ): Iterator {
        return new BlobIterator(
            this.blob as File,
            this.size(),
            offset,
            batch,
            flowPadding
        )
    }
}
