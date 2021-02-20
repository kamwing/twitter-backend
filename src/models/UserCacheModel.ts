import redis from '../database/redis';
import { 
    IPost, 
    ICorePost, 
    IPostID, 
    IProfile, 
    IPostStats, 
    IPostIDDate
} from '../utils/interfaces';
import UserModel from './UserModel';
import dayjs from 'dayjs';
import createError from 'http-errors';
import relativeTime from 'dayjs/plugin/relativeTime'
import PostModel from './PostModel';

/** Module need for generating 'time ago' strings. */
dayjs.extend(relativeTime)

/** Post limit per timeline request. */
const postLimit = 10;

/** Base image path. */
const imagePath = 'https://social.gabe.nz/api/img/';

/**
 * Converts a date into a clean 'time ago' string.
 * @param date Date to be formatted.
 */
const formatDate = (date: Date): string => {
    const dateDifference = new Date().getTime() - date.getTime();
    if ((dateDifference / 1000) < 86400) {
        return dayjs(date).fromNow();
    } else {
        return dayjs(date).format('MMM D');
    }
}

/**
 * Attempts to get a UID first from Redis then PostgreSQL.
 * @param username Valid username.
 */
const getUIDFromUsername = async (username: string): Promise<number> => {
    const uid = await redis.get('user:' + username.toLowerCase());
    if (uid) return parseInt(uid);
    
    return UserModel.getUIDFromUsername(username);
}

/**
 * Attempts to get a username first from Redis then PostgreSQL.
 * @param uid The user's id.
 */
const getUsernameFromUID = async (uid: number): Promise<string> => {
    const username = await redis.hget('user:' + uid, 'username');
    if (username) return username;

    return UserModel.getUsernameFromUID(uid);
}

/**
 * Fetches all the necessary data for needed every post.
 * Does a cache check on every post's user, fetches stats etc.
 * @param postIDs List of post IDs.
 * @param viewerUID ID of the user viewing the postIDs.
 */
const fetchPostsFromID = async (postIDs: IPostID[], viewerUID: number): Promise<IPost[]> => {
    const fullPosts: IPost[] = [];
    const corePosts: ICorePost[] = [];

    const fetchCorePosts = async (postIDs: IPostID[], doCacheCheck?: boolean): Promise<IPostID[]> => {
        const coldPostIDs: IPostID[] = []; 
        for (const postID of postIDs) {
            const rawJSON = await redis.hget('post', postID.pid + ':' + postID.uid);
            if (rawJSON) {
                const newPost = JSON.parse(rawJSON);
                if (postID.repostUsername) newPost.repostUsername = postID.repostUsername;
                corePosts.push(newPost);
            } else if (doCacheCheck) {
                await cacheCheck(postID.uid);
                coldPostIDs.push(postID);
            }
        }
        return coldPostIDs;
    }
    
    // Fetch post data and refresh connected cold users 
    const coldPostIDs = await fetchCorePosts(postIDs, true);
    await fetchCorePosts(coldPostIDs);

    if (corePosts.length === 0 && fullPosts.length > 0) {
        return Promise.reject(createError(404, "One or more invalid post IDs."));
    }

    // Fetch post metadata
    for (const corePost of corePosts) {
        const postID = { pid: corePost.pid, uid: corePost.uid };
        let stats: IPostStats = { pid: corePost.pid, uid: corePost.uid, likes: 0, reposts: 0, comments: 0 }
        const rawStats = await redis.hget('post', corePost.pid + ':' + corePost.uid + ':stats');
        if (rawStats) {
            stats = JSON.parse(rawStats);
        }

        fullPosts.push({
            pid: corePost.pid,
            uid: corePost.uid,
            username: await redis.hget('user:' + corePost.uid, 'username') as string,
            profileURL: imagePath + await redis.hget('user:' + corePost.uid, 'smallProfileURL') as string,
            date: formatDate(new Date(corePost.date)),
            message: corePost.message,
            likes: stats.likes,
            reposts: stats.reposts,
            comments: stats.comments,
            hasLiked: Boolean(await redis.zscore('user:' + viewerUID + ':likes', JSON.stringify(postID))),
            hasReposted: Boolean(await redis.sismember('user:' + viewerUID + ':reposts', JSON.stringify(postID))),
            rawDate: corePost.date,
            repostUsername: corePost.repostUsername
        });
    }

    // // Sorts posts from new to old.
    // fullPosts.sort((a, b) => {
    //     if (a.rawDate! > b.rawDate!) return -1;
    //     return 1;
    // });
    return fullPosts;
}

/**
 * Refreshs Redis with profile data from PostgreSQL.
 * @param uid User ID.
 */
const refreshProfileCache = async (uid: number): Promise<void> => {
    const userID = 'user:' + uid;
    const profile = await UserModel.getProfile(uid);
    const tx = redis.multi();
    const username = await getUsernameFromUID(uid);
    tx.set('user:' + username.toLowerCase(), uid);
    tx.hset(userID, 'username', username);
    tx.hset(userID, 'profileURL', profile.profileURL);
    tx.hset(userID, 'smallProfileURL', profile.smallProfileURL as string);
    tx.hset(userID, 'backgroundURL', profile.backgroundURL);
    tx.hset(userID, 'description', profile.description);
    await tx.exec();
}

/**
 * Checks if a user is already in Redis, refreshes cache not.
 * On refresh it will update Redis with the user's profile, posts,
 * followers, likes and reposts.
 * @param uid User ID.
 */
const cacheCheck = async (uid: number): Promise<void> => {
    const userID = 'user:' + uid;
    if (await redis.hget(userID, 'username')) return; // User still in cache.
    await refreshProfileCache(uid);
    const followers = await UserModel.getFollowers(uid);
    const posts = await UserModel.getAllPosts(uid);
    const postStats = await UserModel.getAllPostStats(uid);
    const comments = await UserModel.getAllPostCommentIDs(uid);
    const likes = await UserModel.getLikes(uid);
    const reposts = await UserModel.getReposts(uid);

    const tx = redis.multi();
    tx.hset(userID, 'followers', followers.length);
    posts.forEach((post) => tx.hset('post', post.pid + ':' + uid, JSON.stringify(post)));
    postStats.forEach((stat) => tx.hset('post', stat.pid + ':' + stat.uid + ':stats', JSON.stringify(stat)));
    comments.forEach((value) => tx.zadd('post:' + value.op.pid + ':' + value.op.uid + ':comments', 
        new Date(value.comment.date).getTime().toString(), 
        JSON.stringify({ pid: value.comment.pid, uid: value.comment.uid })
    ));
    followers.forEach((uid) => tx.sadd(userID + ':followers', uid));
    likes.forEach((post: IPostIDDate) => {
        tx.zadd(userID + ':likes', new Date(post.date).getTime().toString(), JSON.stringify({ pid: post.pid, uid: post.uid }));
    });
    reposts.forEach((postID) => tx.sadd(userID + ':reposts', JSON.stringify(postID)));
    await tx.exec();
}

/**
 * Gets a user's profile from cache.
 * @param uid User ID of the profile.
 * @param viewerUID User ID of the one viewing the profile.
 */
const getProfile = async (uid: number, viewerUID: number): Promise<IProfile> => {
    const userID = 'user:' + uid;
    const username = await redis.hget(userID, 'username') as string;
    const profileURL = imagePath + await redis.hget(userID, 'profileURL') as string;
    const backgroundURL = imagePath + await redis.hget(userID, 'backgroundURL') as string;
    const description = await redis.hget(userID, 'description') as string;
    const followers = await redis.hget(userID, 'followers') as string;
    const following = Boolean(await redis.sismember(userID + ':followers', String(viewerUID)))

    return {
        username,
        profileURL,
        backgroundURL,
        description,
        followers,
        following
    };
}

/**
 * Get a user's small profile image.
 * 
 * @param uid User ID of the profile image being requested.
 */
const getSmallProfileImage = async (uid: number): Promise<string> => {
    return imagePath + (await redis.hget('user:' + uid, "smallProfileURL") as string);
}

/**
 * Get a user timeline's post IDs.
 * Assumes that the user of the profile has already had a cache check.
 * Generates a new user timeline if theres not one already in the cache.
 * @param uid User ID of the profile.
 * @param viewerUID User ID of the one viewing the returned posts.
 * @param lastDate Oldest date that a returned post can be.
 */
const getUserTimeline = async (uid: number, viewerUID: number, lastDate?: Date): Promise<IPost[]> => {
    const hasUserTimeline = await redis.hget('user:' + uid, 'usertimeline');
    if (!hasUserTimeline) { // Need to generate user timeline
        const posts = await UserModel.getAllPostIDs(uid);
        
        const tx = redis.multi();
        posts.forEach((post) => {
            tx.zadd('user:' + uid + ':usertimeline', new Date(post.date).getTime().toString(), JSON.stringify({
                pid: post.pid,
                uid
            }));
        });
        tx.hset('user:' + uid, 'usertimeline', 1);
        
        await tx.exec();
    }

    // Fetch user timeline pids
    const maxScore = String(lastDate ? lastDate.getTime() : new Date().getTime());
    const rawIDS = await redis.zrevrangebyscore('user:' + uid + ':usertimeline', maxScore, '-inf', 'LIMIT', 0, postLimit);
    
    const postIDs: IPostID[] = [];
    rawIDS.forEach((rawID) => postIDs.push(JSON.parse(rawID)));
    
    return fetchPostsFromID(postIDs, viewerUID);
}

/**
 * Get a user's like timeline post IDs.
 * Assumes that the user of the profile has already had a cache check.
 * @param uid User ID of the profile.
 * @param viewerUID User ID of the one viewing the returned posts.
 * @param lastDate Oldest date that a returned post can be.
 */
const getLikeTimeline = async (uid: number, viewerUID: number, lastDate?: Date): Promise<IPost[]> => {
    const maxScore = String(lastDate ? lastDate.getTime() : new Date().getTime());
    const rawIDS = await redis.zrevrangebyscore('user:' + uid + ':likes', maxScore, '-inf', 'LIMIT', 0, postLimit);
    
    const postIDs: IPostID[] = [];
    rawIDS.forEach((rawID) => postIDs.push(JSON.parse(rawID)));
    
    return fetchPostsFromID(postIDs, viewerUID);
}

/**
 * Get a user's home timeline post IDs.
 * Assumes that the user has already had a cache check.
 * @param uid User ID.
 * @param lastDate Oldest date that a returned post can be.
 */
const getHomeTimeline = async (uid: number, lastDate?: Date): Promise<IPost[]> => {
    const hasUserTimeline = await redis.hget('user:' + uid, 'hometimeline');
    if (!hasUserTimeline) { // Need to generate user timeline
        const posts = await UserModel.getHomeTimelinePostIDs(uid);
        
        const tx = redis.multi();
        posts.forEach((post) => {
            tx.zadd('user:' + uid + ':hometimeline', new Date(post.date).getTime().toString(), JSON.stringify({
                pid: post.pid,
                uid: post.uid
            }));
        });
        tx.hset('user:' + uid, 'hometimeline', 1);
        
        await tx.exec();
    }

    // Fetch user timeline pids
    const maxScore = String(lastDate ? lastDate.getTime() : new Date().getTime());
    const rawIDS = await redis.zrevrangebyscore('user:' + uid + ':hometimeline', maxScore, '-inf', 'LIMIT', 0, postLimit);
    
    const postIDs: IPostID[] = [];
    rawIDS.forEach((rawID) => postIDs.push(JSON.parse(rawID)));
    return fetchPostsFromID(postIDs, uid);
}

/**
 * Get a post and it's comment timeline
 * Assumes that the OP is already in the cache.
 * @param post ID of the post being viewed.
 * @param viewerUID User ID of the one viewing the returned posts.
 * @param lastDate Oldest date that a returned post can be.
 */
const getCommentTimeline = async (post: IPostID, viewerUID: number, lastDate?: Date): Promise<{ op?: IPost, comments: IPost[] }> => {
    try {
        const originalPost = (await fetchPostsFromID([post], viewerUID))[0];

        const maxScore = String(lastDate ? lastDate.getTime() : new Date().getTime());
        const rawIDS = await redis.zrevrangebyscore('post:' + post.pid + ':' + post.uid + ':comments', maxScore, '-inf', 'LIMIT', 0, postLimit);
        
        const postIDs: IPostID[] = [];
        rawIDS.forEach((rawID) => postIDs.push(JSON.parse(rawID)));
        
        const comments = await fetchPostsFromID(postIDs, viewerUID);

        if (lastDate) {
            return { comments };
        }
        
        return {
            op: originalPost,
            comments
        }
    } catch (err) {
        return Promise.reject(err);
    }
}

/**
 * Generates search results via full-text search.
 * @param keywords Keywords to be searched.
 * @param viewerUID User ID of the one viewing the returned posts.
 * @param lastDate Oldest date that a returned post can be.
 */
const getSearchTimeline = async (keywords: string, viewerUID: number, lastDate?: Date): Promise<IPost[]> => {
    const maxDate = String(lastDate ? lastDate.toISOString() : new Date().toISOString());
    const postIDs = await PostModel.searchLatest(keywords, maxDate);
    
    if (postIDs.length == 0) return [];

    try {
        return fetchPostsFromID(postIDs, viewerUID);
    } catch (err) {
        return Promise.reject(err);
    }
}

export = { cacheCheck, getSmallProfileImage, refreshProfileCache, getProfile, getUserTimeline, getLikeTimeline, getHomeTimeline, getCommentTimeline, getSearchTimeline, getUIDFromUsername };