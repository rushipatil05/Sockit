import { isDbConnected } from "../db.js";
import { inMemoryStore } from "../services/inMemoryStore.js";

/**
 * Chainable query wrapper for in-memory store operations.
 */
class InMemoryQuery {
    constructor(docs) {
        this.docs = docs;
    }

    lean() {
        return this.docs;
    }

    sort(orderBy) {
        const sortKey = Object.keys(orderBy)[0];
        const sortDir = orderBy[sortKey];
        this.docs.sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (aVal < bVal) return sortDir === 1 ? -1 : 1;
            if (aVal > bVal) return sortDir === 1 ? 1 : -1;
            return 0;
        });
        return this;
    }
}

/**
 * Document wrapper for in-memory store that supports save() method.
 */
class InMemoryDocument {
    constructor(data) {
        Object.assign(this, data);
    }

    async save() {
        // Update in store
        await inMemoryStore.findOneAndUpdate(
            { fileId: this.fileId },
            this,
            { upsert: true }
        );
        return this;
    }

    toObject() {
        const obj = {};
        for (const key in this) {
            if (key !== "save" && key !== "toObject") {
                obj[key] = this[key];
            }
        }
        return obj;
    }
}

/**
 * FileEntry - In-memory storage wrapper
 */
export const FileEntry = {
    async create(data) {
        const doc = await inMemoryStore.create(data);
        return new InMemoryDocument(doc);
    },

    async findOne(query) {
        const doc = inMemoryStore.findOne(query);
        return doc ? new InMemoryDocument(doc) : null;
    },

    async findOneAndUpdate(query, update, options = {}) {
        const doc = await inMemoryStore.findOneAndUpdate(query, update, options);
        return doc ? new InMemoryDocument(doc) : null;
    },

    find(query) {
        const allDocs = inMemoryStore.find(query);
        return {
            lean() {
                return allDocs;
            },
            sort(orderBy) {
                return new InMemoryQuery(allDocs).sort(orderBy);
            }
        };
    },

    async deleteMany(query) {
        return await inMemoryStore.deleteMany(query);
    },

    async deleteOne(query) {
        return await inMemoryStore.deleteOne(query);
    }
};
