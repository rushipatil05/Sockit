import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectMongo() {
    await mongoose.connect(config.mongoUri, {
        autoIndex: true
    });
}
