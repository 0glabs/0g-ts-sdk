import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, EventFragment, AddressLike, ContractRunner, ContractMethod, Listener } from "ethers";
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedLogDescription, TypedListener, TypedContractMethod } from "./common.js";
export type SubmissionNodeStruct = {
    root: BytesLike;
    height: BigNumberish;
};
export type SubmissionNodeStructOutput = [root: string, height: bigint] & {
    root: string;
    height: bigint;
};
export type SubmissionStruct = {
    length: BigNumberish;
    tags: BytesLike;
    nodes: SubmissionNodeStruct[];
};
export type SubmissionStructOutput = [
    length: bigint,
    tags: string,
    nodes: SubmissionNodeStructOutput[]
] & {
    length: bigint;
    tags: string;
    nodes: SubmissionNodeStructOutput[];
};
export type MineContextStruct = {
    epoch: BigNumberish;
    mineStart: BigNumberish;
    flowRoot: BytesLike;
    flowLength: BigNumberish;
    blockDigest: BytesLike;
    digest: BytesLike;
};
export type MineContextStructOutput = [
    epoch: bigint,
    mineStart: bigint,
    flowRoot: string,
    flowLength: bigint,
    blockDigest: string,
    digest: string
] & {
    epoch: bigint;
    mineStart: bigint;
    flowRoot: string;
    flowLength: bigint;
    blockDigest: string;
    digest: string;
};
export type EpochRangeStruct = {
    start: BigNumberish;
    end: BigNumberish;
};
export type EpochRangeStructOutput = [start: bigint, end: bigint] & {
    start: bigint;
    end: bigint;
};
export type EpochRangeWithContextDigestStruct = {
    start: BigNumberish;
    end: BigNumberish;
    digest: BytesLike;
};
export type EpochRangeWithContextDigestStructOutput = [
    start: bigint,
    end: bigint,
    digest: string
] & {
    start: bigint;
    end: bigint;
    digest: string;
};
export interface FlowInterface extends Interface {
    getFunction(nameOrSignature: "commitRoot" | "currentLength" | "epoch" | "epochStartPosition" | "firstBlock" | "getContext" | "getEpochRange" | "makeContext" | "makeContextWithResult" | "nextAlign" | "nextPow2" | "numSubmissions" | "paused" | "queryContextAtPosition" | "root" | "rootHistory" | "submissionIndex" | "submit" | "token" | "unstagedHeight" | "zeros"): FunctionFragment;
    getEvent(nameOrSignatureOrTopic: "NewEpoch" | "Paused" | "Submit" | "Unpaused"): EventFragment;
    encodeFunctionData(functionFragment: "commitRoot", values?: undefined): string;
    encodeFunctionData(functionFragment: "currentLength", values?: undefined): string;
    encodeFunctionData(functionFragment: "epoch", values?: undefined): string;
    encodeFunctionData(functionFragment: "epochStartPosition", values?: undefined): string;
    encodeFunctionData(functionFragment: "firstBlock", values?: undefined): string;
    encodeFunctionData(functionFragment: "getContext", values?: undefined): string;
    encodeFunctionData(functionFragment: "getEpochRange", values: [BytesLike]): string;
    encodeFunctionData(functionFragment: "makeContext", values?: undefined): string;
    encodeFunctionData(functionFragment: "makeContextWithResult", values?: undefined): string;
    encodeFunctionData(functionFragment: "nextAlign", values: [BigNumberish, BigNumberish]): string;
    encodeFunctionData(functionFragment: "nextPow2", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "numSubmissions", values?: undefined): string;
    encodeFunctionData(functionFragment: "paused", values?: undefined): string;
    encodeFunctionData(functionFragment: "queryContextAtPosition", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "root", values?: undefined): string;
    encodeFunctionData(functionFragment: "rootHistory", values?: undefined): string;
    encodeFunctionData(functionFragment: "submissionIndex", values?: undefined): string;
    encodeFunctionData(functionFragment: "submit", values: [SubmissionStruct]): string;
    encodeFunctionData(functionFragment: "token", values?: undefined): string;
    encodeFunctionData(functionFragment: "unstagedHeight", values?: undefined): string;
    encodeFunctionData(functionFragment: "zeros", values: [BigNumberish]): string;
    decodeFunctionResult(functionFragment: "commitRoot", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "currentLength", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "epoch", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "epochStartPosition", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "firstBlock", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getContext", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getEpochRange", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "makeContext", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "makeContextWithResult", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "nextAlign", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "nextPow2", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "numSubmissions", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "paused", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "queryContextAtPosition", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "root", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "rootHistory", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "submissionIndex", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "submit", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "token", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "unstagedHeight", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "zeros", data: BytesLike): Result;
}
export declare namespace NewEpochEvent {
    type InputTuple = [
        sender: AddressLike,
        index: BigNumberish,
        startMerkleRoot: BytesLike,
        submissionIndex: BigNumberish,
        flowLength: BigNumberish,
        context: BytesLike
    ];
    type OutputTuple = [
        sender: string,
        index: bigint,
        startMerkleRoot: string,
        submissionIndex: bigint,
        flowLength: bigint,
        context: string
    ];
    interface OutputObject {
        sender: string;
        index: bigint;
        startMerkleRoot: string;
        submissionIndex: bigint;
        flowLength: bigint;
        context: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace PausedEvent {
    type InputTuple = [account: AddressLike];
    type OutputTuple = [account: string];
    interface OutputObject {
        account: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace SubmitEvent {
    type InputTuple = [
        sender: AddressLike,
        identity: BytesLike,
        submissionIndex: BigNumberish,
        startPos: BigNumberish,
        length: BigNumberish,
        submission: SubmissionStruct
    ];
    type OutputTuple = [
        sender: string,
        identity: string,
        submissionIndex: bigint,
        startPos: bigint,
        length: bigint,
        submission: SubmissionStructOutput
    ];
    interface OutputObject {
        sender: string;
        identity: string;
        submissionIndex: bigint;
        startPos: bigint;
        length: bigint;
        submission: SubmissionStructOutput;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace UnpausedEvent {
    type InputTuple = [account: AddressLike];
    type OutputTuple = [account: string];
    interface OutputObject {
        account: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export interface Flow extends BaseContract {
    connect(runner?: ContractRunner | null): Flow;
    waitForDeployment(): Promise<this>;
    interface: FlowInterface;
    queryFilter<TCEvent extends TypedContractEvent>(event: TCEvent, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    queryFilter<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    on<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    on<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    listeners<TCEvent extends TypedContractEvent>(event: TCEvent): Promise<Array<TypedListener<TCEvent>>>;
    listeners(eventName?: string): Promise<Array<Listener>>;
    removeAllListeners<TCEvent extends TypedContractEvent>(event?: TCEvent): Promise<this>;
    commitRoot: TypedContractMethod<[], [void], "nonpayable">;
    currentLength: TypedContractMethod<[], [bigint], "view">;
    epoch: TypedContractMethod<[], [bigint], "view">;
    epochStartPosition: TypedContractMethod<[], [bigint], "view">;
    firstBlock: TypedContractMethod<[], [bigint], "view">;
    getContext: TypedContractMethod<[], [MineContextStructOutput], "view">;
    getEpochRange: TypedContractMethod<[
        digest: BytesLike
    ], [
        EpochRangeStructOutput
    ], "view">;
    makeContext: TypedContractMethod<[], [void], "nonpayable">;
    makeContextWithResult: TypedContractMethod<[
    ], [
        MineContextStructOutput
    ], "nonpayable">;
    nextAlign: TypedContractMethod<[
        _length: BigNumberish,
        alignExp: BigNumberish
    ], [
        bigint
    ], "view">;
    nextPow2: TypedContractMethod<[_length: BigNumberish], [bigint], "view">;
    numSubmissions: TypedContractMethod<[], [bigint], "view">;
    paused: TypedContractMethod<[], [boolean], "view">;
    queryContextAtPosition: TypedContractMethod<[
        targetPosition: BigNumberish
    ], [
        EpochRangeWithContextDigestStructOutput
    ], "nonpayable">;
    root: TypedContractMethod<[], [string], "view">;
    rootHistory: TypedContractMethod<[], [string], "view">;
    submissionIndex: TypedContractMethod<[], [bigint], "view">;
    submit: TypedContractMethod<[
        submission: SubmissionStruct
    ], [
        [bigint, string, bigint, bigint]
    ], "nonpayable">;
    token: TypedContractMethod<[], [string], "view">;
    unstagedHeight: TypedContractMethod<[], [bigint], "view">;
    zeros: TypedContractMethod<[height: BigNumberish], [string], "view">;
    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
    getFunction(nameOrSignature: "commitRoot"): TypedContractMethod<[], [void], "nonpayable">;
    getFunction(nameOrSignature: "currentLength"): TypedContractMethod<[], [bigint], "view">;
    getFunction(nameOrSignature: "epoch"): TypedContractMethod<[], [bigint], "view">;
    getFunction(nameOrSignature: "epochStartPosition"): TypedContractMethod<[], [bigint], "view">;
    getFunction(nameOrSignature: "firstBlock"): TypedContractMethod<[], [bigint], "view">;
    getFunction(nameOrSignature: "getContext"): TypedContractMethod<[], [MineContextStructOutput], "view">;
    getFunction(nameOrSignature: "getEpochRange"): TypedContractMethod<[digest: BytesLike], [EpochRangeStructOutput], "view">;
    getFunction(nameOrSignature: "makeContext"): TypedContractMethod<[], [void], "nonpayable">;
    getFunction(nameOrSignature: "makeContextWithResult"): TypedContractMethod<[], [MineContextStructOutput], "nonpayable">;
    getFunction(nameOrSignature: "nextAlign"): TypedContractMethod<[
        _length: BigNumberish,
        alignExp: BigNumberish
    ], [
        bigint
    ], "view">;
    getFunction(nameOrSignature: "nextPow2"): TypedContractMethod<[_length: BigNumberish], [bigint], "view">;
    getFunction(nameOrSignature: "numSubmissions"): TypedContractMethod<[], [bigint], "view">;
    getFunction(nameOrSignature: "paused"): TypedContractMethod<[], [boolean], "view">;
    getFunction(nameOrSignature: "queryContextAtPosition"): TypedContractMethod<[
        targetPosition: BigNumberish
    ], [
        EpochRangeWithContextDigestStructOutput
    ], "nonpayable">;
    getFunction(nameOrSignature: "root"): TypedContractMethod<[], [string], "view">;
    getFunction(nameOrSignature: "rootHistory"): TypedContractMethod<[], [string], "view">;
    getFunction(nameOrSignature: "submissionIndex"): TypedContractMethod<[], [bigint], "view">;
    getFunction(nameOrSignature: "submit"): TypedContractMethod<[
        submission: SubmissionStruct
    ], [
        [bigint, string, bigint, bigint]
    ], "nonpayable">;
    getFunction(nameOrSignature: "token"): TypedContractMethod<[], [string], "view">;
    getFunction(nameOrSignature: "unstagedHeight"): TypedContractMethod<[], [bigint], "view">;
    getFunction(nameOrSignature: "zeros"): TypedContractMethod<[height: BigNumberish], [string], "view">;
    getEvent(key: "NewEpoch"): TypedContractEvent<NewEpochEvent.InputTuple, NewEpochEvent.OutputTuple, NewEpochEvent.OutputObject>;
    getEvent(key: "Paused"): TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
    getEvent(key: "Submit"): TypedContractEvent<SubmitEvent.InputTuple, SubmitEvent.OutputTuple, SubmitEvent.OutputObject>;
    getEvent(key: "Unpaused"): TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;
    filters: {
        "NewEpoch(address,uint256,bytes32,uint256,uint256,bytes32)": TypedContractEvent<NewEpochEvent.InputTuple, NewEpochEvent.OutputTuple, NewEpochEvent.OutputObject>;
        NewEpoch: TypedContractEvent<NewEpochEvent.InputTuple, NewEpochEvent.OutputTuple, NewEpochEvent.OutputObject>;
        "Paused(address)": TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
        Paused: TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
        "Submit(address,bytes32,uint256,uint256,uint256,tuple)": TypedContractEvent<SubmitEvent.InputTuple, SubmitEvent.OutputTuple, SubmitEvent.OutputObject>;
        Submit: TypedContractEvent<SubmitEvent.InputTuple, SubmitEvent.OutputTuple, SubmitEvent.OutputObject>;
        "Unpaused(address)": TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;
        Unpaused: TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;
    };
}
//# sourceMappingURL=Flow.d.ts.map