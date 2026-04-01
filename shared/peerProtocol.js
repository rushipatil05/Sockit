export const PROTOCOL_VERSION = "1.0";

export const Events = {
    HELLO: "peer:hello",
    GOODBYE: "peer:goodbye",
    INDEX_REQUEST: "index:request",
    INDEX_FULL: "index:full",
    INDEX_UPSERT: "index:upsert",
    INDEX_REMOVE: "index:remove",
    TRANSFER_PULL_REQUEST: "transfer:pull-request",
    TRANSFER_PROGRESS: "transfer:progress",
    TRANSFER_COMPLETE: "transfer:complete",
    TRANSFER_ERROR: "transfer:error",
    PEER_STATE: "peer:state"
};

export const Roles = {
    UI: "ui",
    PEER: "peer"
};
