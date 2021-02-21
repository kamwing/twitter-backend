import redis from '../database/redis';
import { pool } from '../database/postgres';
import createError from 'http-errors';
import { 
    IProfile, 
    ICorePost, 
    IPostID, 
    IPostStats, 
    IPostIDDate, 
    IPostCommentID,
} from '../utils/interfaces';

export = {
    /**
     * Attempts to get a UID from a user's username.
     * @param username A username.
     */
    getUIDFromUsername: async (username: string): Promise<number> => {
        const client = await pool.connect();
        const SQL = 'SELECT uid FROM public.user WHERE username_lower = LOWER($1);';

        const { rows } = await client.query(SQL, [username]);
        client.release();

        if (rows.length == 0) {
            return Promise.reject(createError(404, 'Invalid username'));
        }

        return rows[0].uid;
    },
    /**
     * Gets a username from a user's ID.
     * @param uid User ID.
     */
    getUsernameFromUID: async (uid: number): Promise<string> => {
        const client = await pool.connect();
        const SQL = 'SELECT username FROM public.user WHERE uid = $1;';

        const { rows } = await client.query(SQL, [uid]);
        client.release();

        if (rows.length == 0) {
            return Promise.reject(createError(404, "Invalid user ID."));
        }

        return rows[0].username;
    },
    /**
     * Get basic profile data.
     * @param uid User ID of the profile.
     */
    getProfile: async (uid: number): Promise<IProfile> => {
        const client = await pool.connect();
        const SQL = 'SELECT username, small_profile_img, profile_img, background_img, description FROM public.user WHERE uid = $1;';

        const { rows } = await client.query(SQL, [uid]);
        client.release();

        if (rows.length == 0) {
            return Promise.reject(createError(404, "Invalid user ID."));
        }

        return {
            username: rows[0].username,
            smallProfileURL: rows[0].small_profile_img,
            profileURL: rows[0].profile_img,
            backgroundURL: rows[0].background_img,
            description: rows[0].description,
        };
    },
    /**
     * Update a user's profile image urls.
     * @param uid User ID.
     * @param smallPath Path of the small image used on posts.
     * @param bigPath Path of the big image used on profiles.
     */
    updateProfileIMG: async (uid: number, smallPath: string, bigPath: string): Promise<void> => {
        const client = await pool.connect();
        const SQL = 'UPDATE public.user SET small_profile_img = $2, profile_img = $3 WHERE uid = $1;'
        await client.query(SQL, [uid, smallPath, bigPath]);
        client.release();
    },
    /**
     * Update a user's profile background image url.
     * @param uid User ID.
     * @param backgroundPath Path of the big image used on profiles.
     */
    updateBackgroundIMG: async (uid: number, backgroundPath: string): Promise<void> => {
        const client = await pool.connect();
        const SQL = 'UPDATE public.user SET background_img = $2 WHERE uid = $1;'
        await client.query(SQL, [uid, backgroundPath]);
        client.release();
    },
    /**
     * Changes a user's username.
     * @param uid User ID.
     * @param username A new username.
     */
    updateUsername: async (uid: number, username: string): Promise<void> => {
        const client = await pool.connect();
        const SQL = 'UPDATE public.user SET username = $2, username_lower = LOWER($2) WHERE uid = $1;'
        await client.query(SQL, [uid, username]);
        client.release();
    },
    /**
     * Updates a user's profile description.
     * @param uid User ID.
     * @param description A new description.
     */
    updateDescription: async (uid: number, description: string): Promise<void> => {
        const client = await pool.connect();
        const SQL = 'UPDATE public.user SET description = $2 WHERE uid = $1;'
        await client.query(SQL, [uid, description]); 
        client.release();
    },
    /**
     * Get a list of all a user's followers.
     * @param uid User ID.
     */
    getFollowers: async (uid: number): Promise<number[]> => {
        const client = await pool.connect();
        const SQL = 'SELECT uid FROM public.user_following WHERE fid = $1;';

        const { rows } = await client.query(SQL, [uid]);
        client.release();

        const result: number[] = [];

        for (const row of rows) {
            result.push(row.uid);
        }

        return result;
    },
    /**
     * Updates a user's following list.
     * @param uid The user ID following another user.
     * @param fid The user ID being followed.
     */
    follow: async (uid: number, fid: number): Promise<void> => {
        const client = await pool.connect();
        const SQL = 'INSERT INTO public.user_following VALUES ($1, $2);';

        await client.query(SQL, [uid, fid]);

        redis.sadd('user:' + fid + ':followers', uid);

        redis.sadd('batch:user', fid);
        client.release();
    },
    /**
     * Updates a user's following list.
     * @param uid The user ID unfollowing another user.
     * @param fid The user ID being unfollowed.
     */
    unfollow: async (uid: number, fid: number): Promise<void> => {
        const client = await pool.connect();
        const SQL = 'DELETE FROM public.user_following WHERE uid = $1 AND fid = $2;';

        await client.query(SQL, [uid, fid]);

        redis.srem('user:' + fid + ':followers', uid);

        redis.sadd('batch:user', fid);

        client.release();
    },
    /**
     * Get all the core data of every post from a user.
     * @param uid User ID.
     */
    getAllPosts: async (uid: number): Promise<ICorePost[]> => {
        const client = await pool.connect();
        const SQL = 'SELECT pid, uid, message, date FROM public.post WHERE uid = $1;';

        const { rows } = await client.query(SQL, [uid]);
        client.release();

        return rows;
    },
    /**
     * Get all the post IDs (with dates), created by a user.
     * @param uid User ID.
     */
    getAllPostIDs: async (uid: number): Promise<{ pid: number, date: string }[]> => {
        const client = await pool.connect();
        const SQL = 'SELECT pid, date FROM public.post WHERE uid = $1;';

        const { rows } = await client.query(SQL, [uid]);
        client.release();

        return rows;
    },
    /**
     * Get all the post IDs (with dates), liked by a user.
     * @param uid User ID.
     */
    getLikes: async (uid: number): Promise<IPostIDDate[]> => {
        const client = await pool.connect();
        const SQL = 'SELECT post_pid as pid, post_uid as uid, date FROM public.user_like WHERE public.user_like.uid = $1;';

        const { rows } = await client.query(SQL, [uid]);
        client.release();

        return rows;
    },
    /**
     * Get all the post IDs (with dates), reposted by a user.
     * @param uid User ID.
     */
    getReposts: async (uid: number): Promise<IPostID[]> => {
        const client = await pool.connect();
        const SQL = 'SELECT post_pid as pid, post_uid as uid, date FROM public.user_repost WHERE public.user_repost.uid = $1;';

        const { rows } = await client.query(SQL, [uid]);
        client.release();
        
        return rows;
    },
    /**
     * Get all the post stats of posts, created by a user.
     * @param uid User ID.
     */
    getAllPostStats: async (uid: number): Promise<IPostStats[]> => {
        const client = await pool.connect();
        const SQL = 'SELECT pid, uid, likes, reposts, comments FROM public.post_stats WHERE uid = $1;';

        const { rows } = await client.query(SQL, [uid]);
        client.release();

        return rows;
    },
    /**
     * Get all the post IDs of a users home timeline.
     * @param uid User ID.
     */
    getHomeTimelinePostIDs: async (uid: number): Promise<IPostID[]> => {
        const client = await pool.connect();
        const FOLLOW_SQL = 'SELECT public.post.pid as pid, public.post.uid as uid, date FROM public.post INNER JOIN public.user_following ON public.user_following.fid = public.post.uid AND public.user_following.uid = $1;';
        const MY_SQL = 'SELECT public.post.pid as pid, public.post.uid as uid, date FROM public.post WHERE public.post.uid = $1;';
        
        const results: IPostID[] = [];
        const myRows = (await client.query(MY_SQL, [uid])).rows;
        const followRows = (await client.query(FOLLOW_SQL, [uid])).rows;

        for (const row of myRows) {
            results.push({
                pid: row.pid,
                uid: row.uid,
                date: row.date
            });
        }

        for (const row of followRows) {
            results.push({
                pid: row.pid,
                uid: row.uid,
                date: row.date
            });
        }

        client.release();
        return results;
    },
    /**
     * Get all comment post IDs for every post, created by a user.
     * @param uid User ID.
     */
    getAllPostCommentIDs: async (uid: number): Promise<IPostCommentID[]> => {
        const client = await pool.connect();
        const SQL = 'SELECT op_pid, op_uid, comment_pid, comment_uid, p2.date as date FROM public.post_comment JOIN public.post AS p1 ON p1.pid = public.post_comment.op_pid AND p1.uid = public.post_comment.op_uid JOIN public.post AS p2 ON p2.pid = comment_pid AND p2.uid = comment_uid WHERE p1.uid = $1;';

        const { rows } = await client.query(SQL, [uid]);
        client.release();
        
        const res: IPostCommentID[] = [];
        rows.forEach((row) => res.push({
            op: { pid: Number(row.op_pid), uid: Number(row.op_uid) },
            comment: { pid: Number(row.comment_pid), uid: Number(row.comment_uid), date: row.date },
        }));

        return res;
    },
    /**
     * Calculates a user's follower count.
     * 
     * @param uid ID of the user in question.
     */
    caculateFollowers: async (uid: number): Promise<number> => {
        const client = await pool.connect();
        const SQL = 'SELECT count(uid) as followers FROM public.user_following WHERE fid = $1;';

        const { rows } = await client.query(SQL, [uid]);
        client.release();
        return rows[0].followers;
    }
}