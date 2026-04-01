import mongoose from "mongoose";

const sharedFileSchema = new mongoose.Schema(
    {
        fileId: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        size: { type: Number, required: true },
        mimeType: { type: String, required: true },
        path: { type: String, default: null },
        ownerPeerId: { type: String, required: true, index: true },
        ownerName: { type: String, required: true },
        isLocal: { type: Boolean, default: false, index: true },
        hash: { type: String, default: null },
        updatedAtSource: { type: Number, default: () => Date.now() }
    },
    { timestamps: true }
);

export const SharedFile = mongoose.model("SharedFile", sharedFileSchema);
