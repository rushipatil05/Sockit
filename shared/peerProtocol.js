export const PROTOCOL_VERSION = "1.0";

export const Events = {
    // UDP Discovery
    HELLO: "peer:hello",
    GOODBYE: "peer:goodbye",

    // UI state updates pushed by server
    PEER_STATE: "peer:state",
    FILES_UPDATED: "files:updated"
};
