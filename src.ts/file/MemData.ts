import { Iterator, MemIterator } from './Iterator/index.js'
import { AbstractFile } from './AbstractFile.js'
import { Bytes } from '@ethersproject/bytes'

export class MemData extends AbstractFile {

    fileSize: number = 0

    constructor(data: Bytes) {
        super()
        this.fileSize = data.length
    }

    iterateWithOffsetAndBatch(
        offset: number,
        batch: number,
        flowPadding: boolean
    ): Iterator {
        return new MemIterator(
            new Uint8Array(0),
            this.size(),
            offset,
            batch,
            flowPadding
        )
    }
}
