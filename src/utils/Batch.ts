import PostModel from '../models/PostModel';
import redis from '../database/redis';
import { IPostID } from './interfaces';
import UserModel from '../models/UserModel';

/**
 * Manages the fetching and execution of batches.
 */
export default class Batch {
    /** All the posts to be processed in this batch. */
    private userIDs: Set<number>;
    private postIDs: Set<IPostID>;
    /** Maximum amount of objects to be processed in this batch. */
    private size: number;
    
    /**
     * Initializes all necessary data structures.
     * @param size Maximum number of objects to be procssed.
     */
    constructor(size: number) {
        this.postIDs = new Set();
        this.userIDs = new Set();
        this.size = size;
    }

    /**
     * Fetches the batch from redis.
     * @returns True if theres objects to be processed.
     */
    private async fetch(): Promise<boolean> {
        const rawPosts = await redis.spop('batch:post', this.size);
        const rawUsers = await redis.spop('batch:user', this.size);

        rawPosts.forEach((value) => this.postIDs.add(JSON.parse(value)));

        rawUsers.forEach((value) => this.userIDs.add(parseInt(value)));

        return this.postIDs.size > 0 || this.userIDs.size > 0;
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

        for (const uid of this.userIDs) {
            const followers = await UserModel.caculateFollowers(uid);
            tx.hset('user:' + uid, 'followers', followers);
        }

        await tx.exec();
    }
}