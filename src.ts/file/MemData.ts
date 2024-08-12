import { Iterator, MemIterator } from './Iterator/index.js'
import { AbstractFile } from './AbstractFile.js'

export class MemData extends AbstractFile {
    fileSize: number = 0
    data: ArrayLike<number>

    constructor(data: ArrayLike<number>) {
        super()
        this.data = data
        this.fileSize = data.length
    }

    iterateWithOffsetAndBatch(
        offset: number,
        batch: number,
        flowPadding: boolean
    ): Iterator {
        const data = new Uint8Array(this.data)

        return new MemIterator(data, this.size(), offset, batch, flowPadding)
    }
}
