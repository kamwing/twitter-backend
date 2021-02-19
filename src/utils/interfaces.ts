/**
 * Represents the final post object that the HTTP client will receive.
 */
export interface IPost {
    pid: number;
    uid: number;
    username: string;
    profileURL: string;
    date: string;
    message: string;
    likes: number,
    reposts: number,
    comments: number,
    hasLiked: boolean,
    hasReposted: boolean,
    isRepost?: boolean,
    repostUsername?: string
    rawDate: string;
}

/**
 * Represents a post's PID and UID.
 */
export interface IPostID {
    pid: number;
    uid: number;
    repostUsername?: string;
}

/**
 * Represents a post's ID, its contents and date posted.
 */
export interface ICorePost {
    pid: number;
    uid: number;
    message: string;
    date: string;
    repostUsername?: string;
}

/**
 * Represents the final profile object that gets sent to the HTTP client.
 */
export interface IProfile {
    username: string;
    profileURL: string;
    smallProfileURL?: string;
    backgroundURL: string;
    description: string;
    followers?: string;
    following?: boolean;
}

/** Represents a post's ID and its engagements. */
export interface IPostStats {
    pid: number;
    uid: number;
    likes: number;
    reposts: number;
    comments: number;
}

/**
 * Represents a post's ID and date posted.
 */
export interface IPostIDDate extends IPostID {
    date: string;
}

/** Represents a comments post ID and the OP's post ID. */
export interface IPostCommentID {
    op: IPostID;
    comment: IPostIDDate;
}