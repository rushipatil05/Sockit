/**
 * In-memory file storage that mimics MongoDB FileEntry operations.
 * Used as fallback when MongoDB is unavailable.
 */

export class InMemoryStore {
    constructor() {
        this.files = new Map(); // Map<fileId, fileObject>
        this.idempotencyKey = 0;
    }

    async create(data) {
        const id = this.idempotencyKey++;
        const doc = {
            _id: id,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.files.set(data.fileId, doc);
        return doc;
    }

    findOne(query) {
        for (const [, doc] of this.files) {
            if (this._matchesQuery(doc, query)) {
                return doc;
            }
        }
        return null;
    }

    async findOneAndUpdate(query, update, options = {}) {
        let doc = null;
        for (const [fileId, existing] of this.files) {
            if (this._matchesQuery(existing, query)) {
                doc = existing;
                break;
            }
        }

        if (!doc && options.upsert) {
            doc = await this.create(update);
        } else if (doc) {
            const updated = { ...doc, ...update, updatedAt: new Date() };
            this.files.set(updated.fileId, updated);
            doc = updated;
        }

        return options.new ? doc : null;
    }

    find(query) {
        const results = [];
        for (const [, doc] of this.files) {
            if (this._matchesQuery(doc, query)) {
                results.push(doc);
            }
        }
        return results;
    }

    async deleteMany(query) {
        let count = 0;
        for (const [fileId, doc] of this.files) {
            if (this._matchesQuery(doc, query)) {
                this.files.delete(fileId);
                count++;
            }
        }
        return { deletedCount: count };
    }

    async deleteOne(query) {
        for (const [fileId, doc] of this.files) {
            if (this._matchesQuery(doc, query)) {
                this.files.delete(fileId);
                return { deletedCount: 1 };
            }
        }
        return { deletedCount: 0 };
    }

    _matchesQuery(doc, query) {
        for (const [key, value] of Object.entries(query)) {
            if (key === "$or") {
                if (!Array.isArray(value)) return false;
                if (!value.some(condition => this._matchesQuery(doc, condition))) {
                    return false;
                }
            } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                // Handle operators like { $in: [...] }, { $exists: true }, etc.
                if (value.$in && !value.$in.includes(doc[key])) return false;
                if (value.$exists !== undefined) {
                    const exists = doc[key] !== undefined;
                    if (value.$exists !== exists) return false;
                }
                if (value.$ne !== undefined && doc[key] === value.$ne) return false;
            } else {
                if (doc[key] !== value) return false;
            }
        }
        return true;
    }

    clear() {
        this.files.clear();
    }
}

export const inMemoryStore = new InMemoryStore();
