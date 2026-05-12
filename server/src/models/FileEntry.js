import { inMemoryStore } from "../services/inMemoryStore.js";

/**
 * Chainable query wrapper for in-memory store operations.
 * Mimics Mongoose Query object.
 */
class InMemoryQuery {
    constructor(promiseOrDocs) {
        this.promise = Promise.resolve(promiseOrDocs);
    }

    async then(resolve, reject) {
        try {
            const result = await this.promise;
            return resolve(result);
        } catch (err) {
            if (reject) return reject(err);
            throw err;
        }
    }

    lean() {
        // For in-memory, everything is already a POJO or we can toObject it.
        // We'll wrap the current promise to return raw objects.
        const originalPromise = this.promise;
        this.promise = (async () => {
            const result = await originalPromise;
            if (Array.isArray(result)) {
                return result.map(doc => doc instanceof InMemoryDocument ? doc.toObject() : doc);
            }
            return result instanceof InMemoryDocument ? result.toObject() : result;
        })();
        return this;
    }

    sort(orderBy) {
        const originalPromise = this.promise;
        this.promise = (async () => {
            const docs = await originalPromise;
            if (!Array.isArray(docs)) return docs;
            
            const sortKey = Object.keys(orderBy)[0];
            const sortDir = orderBy[sortKey];
            
            return [...docs].sort((a, b) => {
                const aVal = a[sortKey];
                const bVal = b[sortKey];
                if (aVal < bVal) return sortDir === 1 ? -1 : 1;
                if (aVal > bVal) return sortDir === 1 ? 1 : -1;
                return 0;
            });
        })();
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
            this.toObject(),
            { upsert: true }
        );
        return this;
    }

    toObject() {
        const obj = {};
        for (const key in this) {
            if (typeof this[key] !== "function") {
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

    findOne(query) {
        const promise = (async () => {
            const doc = await inMemoryStore.findOne(query);
            return doc ? new InMemoryDocument(doc) : null;
        })();
        return new InMemoryQuery(promise);
    },

    async findOneAndUpdate(query, update, options = {}) {
        const doc = await inMemoryStore.findOneAndUpdate(query, update, options);
        return doc ? new InMemoryDocument(doc) : null;
    },

    find(query) {
        const promise = (async () => {
            const docs = await inMemoryStore.find(query);
            return docs.map(d => new InMemoryDocument(d));
        })();
        return new InMemoryQuery(promise);
    },

    async deleteMany(query) {
        return await inMemoryStore.deleteMany(query);
    },

    async deleteOne(query) {
        return await inMemoryStore.deleteOne(query);
    }
};
