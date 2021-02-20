import { pool } from '../database/postgres';
import redis from '../database/redis';
import { ICorePost, IPostID, IPostStats } from '../utils/interfaces';
import UserModel from './UserModel';

/**
 * Updates redis when a new post has been added, by updating OP's user timeline, 
 * adding the post ID to all OP's followers timelines and adding the post itself.
 * @param uid The user that has created/reposted the given post.
 * @param post Post ID, message and date.
 * @param replyTo If the new post is a comment, this is the ID of the post being replied to.
 * @param replyDate If the new post is a comment, this is the date of comment.
 */
const addCachePost = async (uid: number, post: ICorePost, replyTo?: IPostID, replyDate?: string): Promise<void> => {
    // Get a list of OP's followers
    const followers = await redis.smembers('user:' + uid + ':followers');
    followers.push(uid.toString());

    const postID = {
        pid: post.pid,
        uid: post.uid,
        repostUsername: post.repostUsername
    }; 

    const tx = redis.multi();
    // Add postID to every followers home timeline
    for (const follower of followers) {
        const homeTimeline = await redis.hget('user:' + follower, 'hometimeline');
        if (homeTimeline) {
            tx.zadd('user:' + follower + ':hometimeline', new Date(post.date).getTime().toString(), JSON.stringify(postID));
        }
    }

    // Add postID to OP's user timeline
    const userTimeline = await redis.hget('user:' + post.uid, 'usertimeline');
    if (userTimeline) {
        tx.zadd('user:' + uid + ':usertimeline', new Date(post.date).getTime().toString(), JSON.stringify(postID));
    }

    // Add post to cache
    if (!post.repostUsername) {
        tx.hset('post', post.pid + ':' + post.uid, JSON.stringify(post));
        // If comment, add identifier
        if (replyTo && replyDate) {
            tx.zadd('post:' + replyTo.pid + ':' + replyTo.uid + ':comments', replyDate, JSON.stringify(postID));

        }
    }

    await tx.exec();
}

/**
 * Deletes a post ID from all timelines and the post it self from redis.
 * @param uid ID of the user that created/reposted the given post.
 * @param postID The id of a post.
 */
const deleteCachePost = async (uid: number, postID: IPostID): Promise<void> => {
    const followers = await redis.smembers('user:' + uid + ':followers');
    followers.push(uid.toString());

    const tx = redis.multi();
    for (const follower of followers) {
        tx.zrem('user:' + follower + ':hometimeline', JSON.stringify(postID));
    }
    tx.zrem('user:' + uid + ':usertimeline', JSON.stringify(postID));
    
    if (!postID.repostUsername) tx.hdel('post', postID.pid + ':' + postID.uid);
    
    await tx.exec();
}

export = {
    /**
     * Creates a new post.
     * @param uid User ID.
     * @param message The post's message.
     */
    createPost: async (uid: number, message: string): Promise<void> => {
        const client = await pool.connect();
        const PID_SQL = 'SELECT coalesce(MAX(pid) + 1, 1) FROM public.post WHERE uid = $1;';
        const SQL = 'INSERT INTO public.post values($1, $2, $3, $4);';
        const date = new Date();

        const { rows } = await client.query(PID_SQL, [uid]);
        const pid = parseInt(rows[0].coalesce);

        await client.query(SQL, [pid, uid, message, date.toISOString()]);
        
        await addCachePost(uid, { pid, uid, message, date: date.toISOString() });

        client.release();
    },
    /**
     * Creates a new comment post.
     * @param uid ID of user who created the comment.
     * @param postID ID of the post being replied to.
     * @param message The comment's message.
     */
    createComment: async (uid: number, postID: IPostID, message: string): Promise<void> => {
        const client = await pool.connect();
        const PID_SQL = 'SELECT coalesce(MAX(pid) + 1, 1) AS new_pid FROM public.post WHERE uid = $1;';
        const POST_SQL = 'INSERT INTO public.post values($1, $2, $3, $4);';
        const COMMENT_SQL = 'INSERT INTO public.post_comment values($1, $2, $3, $4);';
        const rawDate = new Date();
        const date = rawDate.toISOString();

        try {
            await client.query('BEGIN');
            const { new_pid } = (await client.query(PID_SQL, [uid])).rows[0];
            await client.query(POST_SQL, [new_pid, uid, message, date]);
            await client.query(COMMENT_SQL, [postID.pid, postID.uid, new_pid, uid]);
            await client.query('COMMIT');
            
            await addCachePost(uid, { pid: new_pid, uid, message, date }, postID, rawDate.getTime().toString());
            await redis.sadd('batch:post', JSON.stringify(postID));
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },
    /**
     * Deletes a post from PostgreSQL and Redis.
     * @param postID Post ID.
     */
    deletePost: async (postID: IPostID): Promise<void> => {
        const client = await pool.connect();
        const SQL = 'DELETE FROM public.post WHERE uid = $1 AND pid = $2;';
        
        await client.query(SQL, [postID.uid, postID.pid]);
        client.release();
        // TODO: check if post is comment
        // TODO: add OP's post to batch processing
        deleteCachePost(postID.uid, postID);
    },
    /**
     * Likes a post and adds it to batch processing.
     * @param uid User ID liking the post.
     * @param postID The post ID being liked.
     */
    likePost: async (uid: number, postID: IPostID): Promise<void> => {
        const client = await pool.connect();
        const SQL = 'INSERT INTO public.user_like values($1, $2, $3, now());';

        await client.query(SQL, [uid, postID.pid, postID.uid]);
        client.release();

        const userInCache = await redis.hget('user:' + uid, 'username');
        if (userInCache) {
            // Add to user's likes
            await redis.zadd('user:' + uid + ':likes', new Date().getTime().toString(), JSON.stringify(postID));
        }

        await redis.sadd('batch:post', JSON.stringify(postID));
    },
    /**
     * Unlikes a post and adds it to batch processing.
     * @param uid User ID unliking the post.
     * @param postID The post ID being unliked.
     */
    unlikePost: async (uid: number, postID: IPostID): Promise<void> => {
        const client = await pool.connect();
        const SQL = 'DELETE FROM public.user_like WHERE uid = $1 AND post_pid = $2 AND post_uid = $3;';

        await client.query(SQL, [uid, postID.pid, postID.uid]);
        client.release();

        const tx = redis.multi();
        tx.zrem('user:' + uid + ':liketimeline', JSON.stringify(postID));
        tx.zrem('user:' + uid + ':likes', JSON.stringify(postID));
        await tx.exec();

        await redis.sadd('batch:post', JSON.stringify(postID));
    },
    /**
     * Reposts a post and adds it to batch processing.
     * @param uid User ID reposting the post.
     * @param postID The post ID being reposted.
     */
    repost: async (uid: number, postID: IPostID): Promise<void> => {
        const client = await pool.connect();
        const SQL = 'INSERT INTO public.user_repost values($1, $2, $3, now());';
        const date = new Date();

        await client.query(SQL, [uid, postID.pid, postID.uid]);
        client.release();

        await redis.sadd('user:' + uid + ':reposts', JSON.stringify(postID));
        await redis.sadd('batch:post', JSON.stringify(postID));

        await addCachePost(uid, { 
            pid: postID.pid, 
            uid: postID.uid, 
            message: "", 
            date: date.toISOString(), 
            repostUsername: await UserModel.getUsernameFromUID(uid) 
        });
    },
    /**
     * Unreposts a post and adds it to batch processing.
     * @param uid User ID unreposting the post.
     * @param postID The post ID being unreposted.
     */
    unrepost: async (uid: number, postID: IPostID): Promise<void> => {
        const client = await pool.connect();
        const SQL = 'DELETE FROM public.user_repost WHERE uid = $1 AND post_pid = $2 AND post_uid = $3;';

        await client.query(SQL, [uid, postID.pid, postID.uid]);
        client.release();

        await redis.srem('user:' + uid + ':reposts', JSON.stringify(postID));

        const newPostID = postID;
        newPostID.repostUsername = await UserModel.getUsernameFromUID(uid);
        deleteCachePost(uid, newPostID);

        await redis.sadd('batch:post', JSON.stringify(postID));
    },
    /**
     * Calculates a post's engagement stats.
     * @param postID The post ID thats being calculated.
     */
    calculatePostStats: async (postID: IPostID): Promise<IPostStats> => {
        const client = await pool.connect();
        const SQL = 'select (select count(*) as likes FROM public.user_like WHERE public.user_like.post_pid = $1 AND public.user_like.post_uid = $2), (select count(*) as reposts FROM public.user_repost WHERE public.user_repost.post_pid = $1 AND public.user_repost.post_uid = $2), (select count(*) as comments FROM public.post_comment WHERE public.post_comment.op_pid = $1 AND public.post_comment.op_uid = $2);';

        const { rows } = await client.query(SQL, [postID.pid, postID.uid]);
        client.release();
        return rows[0];
    },
    /**
     * Sets a post's engagement stats.
     * @param postID The post ID thats having its engagement stats set.
     */
    setPostStats: async (postID: IPostID, stats: IPostStats): Promise<void> => {
        const client = await pool.connect();
        const SQL = 'INSERT INTO public.post_stats values($1, $2, $3, $4, $5) ON CONFLICT (pid, uid) DO UPDATE SET likes = $3, reposts = $4, comments = $5;';

        await client.query(SQL, [postID.pid, postID.uid, stats.likes, stats.reposts, stats.comments]);
        client.release();
    },
    /**
     * Executes a full-text search for posts.
     * @param keywords User generated keywords to search for.
     * @param lastDate Returned results can't be any older than this date.
     */
    searchLatest: async (keywords: string, lastDate: string): Promise<IPostID[]> => {
        const client = await pool.connect();
        const SQL = 'SELECT pid, uid FROM public.post WHERE to_tsvector(message) @@ plainto_tsquery(\'english\', $1) AND date < $2 LIMIT 10;';

        const { rows } = await client.query(SQL, [keywords, lastDate]);

        return rows;
    }
}