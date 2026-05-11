import mongoose from "mongoose";

const fileEntrySchema = new mongoose.Schema(
    {
        fileId:        { type: String, required: true, unique: true, index: true },
        name:          { type: String, required: true },
        size:          { type: Number, required: true },
        mimeType:      { type: String, default: "application/octet-stream" },
        path:          { type: String, default: null },   // local path — null for remote files
        ownerPeerId:   { type: String, required: true, index: true },
        ownerName:     { type: String, required: true },
        isLocal:       { type: Boolean, required: true },
        hash:          { type: String, default: null },
        updatedAtSource: { type: Number, required: true }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

export const FileEntry = mongoose.model("FileEntry", fileEntrySchema);
