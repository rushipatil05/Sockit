import mongoose from "mongoose";

export async function connectDb(uri) {
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000
    });
    console.log("[db] connected to MongoDB");
}

export async function disconnectDb() {
    await mongoose.disconnect();
    console.log("[db] disconnected from MongoDB");
}
