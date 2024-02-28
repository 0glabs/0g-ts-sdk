export interface Iterator {
    next(): Promise<[boolean, Error | null]>;
    current(): Uint8Array;
}
//# sourceMappingURL=Iterator.d.ts.map