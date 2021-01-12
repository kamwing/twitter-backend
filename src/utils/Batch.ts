import PostModel from '../models/PostModel';
import redis from '../database/redis';
import { IPostID } from './interfaces';

/**
 * Manages the fetching and execution of batches.
 */
export default class Batch {
    /** All the posts to be processed in this batch. */
    private postIDs: Set<IPostID>;
    /** Maximum amount of objects to be processed in this batch. */
    private size: number;
    
    /**
     * Initializes all necessary data structures.
     * @param size Maximum number of objects to be procssed.
     */
    constructor(size: number) {
        this.postIDs = new Set();
        this.size = size;
    }

    /**
     * Fetches the batch from redis.
     * @returns True if theres objects to be processed.
     */
    private async fetch(): Promise<boolean> {
        const rawPosts = await redis.spop('batch:post', this.size);

        rawPosts.forEach((value) => this.postIDs.add(JSON.parse(value)));

        return this.postIDs.size > 0;
    }

    /**
     * Executes the batch and processes all objects found.
     */
    public async exec(): Promise<void> {
        const hasBatch = await this.fetch();
        if (!hasBatch) return;

        const tx = redis.multi();
        for (const postID of this.postIDs) {
            const postStats = await PostModel.calculatePostStats(postID);
            tx.hset('post', postID.pid + ':' + postID.uid + ':stats', JSON.stringify(postStats));
            await PostModel.setPostStats(postID, postStats);
        }

        await tx.exec();
    }
}