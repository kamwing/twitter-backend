/*
    ioredis docs: https://github.com/luin/ioredis/blob/HEAD/API.md
    design guide: https://www.geeksforgeeks.org/design-twitter-a-system-design-interview-question/
    Redis timestamp sets: https://stackoverflow.com/questions/17153154/redis-data-structure-design-for-sorting-time-based-values

    Follow:
    - Save to PostgreSQL
    - Add to Redis
        - Add to user's following list (or fetch entire list if list not found)
        - Add to followees followers list if exists
        - Fetch follow user posts and add to home timeline

    New post:
    - Save to PostgreSQL
    - Add to Redis
        - Add post data
        - Add post id to OP's profile and home timeline (calculate timeline if not found)
        - Add post id to all followers' home timelines if they exist

    Fetch timeline (home or profile):
    - Get timeline from Redis (RECENT USER)
    - Old user
        - Calculate timeline and add to Redis
        - Add following and follower lists to Redis
    
    Counting likes, reposts & comments
    - On like/unlike.. etc add post id to queue for processing
    - After x amount of ms, start new batch
    - Once processed, add data to posts in Redis and PostgreSQL
    
    Search:
    - Full text: https://www.postgresql.org/docs/9.5/textsearch.html

    Logout: (OR DELETE COOKIE AND YOLO)
    - Remove the token cookie
    - Add token to Redis, into a blacklist set
    - On every REST request check if token exists in blacklist set
 
    Set Redis Objects:
    - hset user:uid username|profileURL|smallProfileURL|backgroundURL|description|followers|following|hasHTimeline.. data
    - hset user:usernameLower uid data
        - sadd user:uid:followers FOLLOWER_UID
        - sadd user:uid:likes postID
        - sadd user:uid:reposts postID
        - zadd user:uid:hometimeline postDate postID
        - zadd user:uid:usertimeline postDate postID
        - zadd user:uid:liketimeline postDate postID
        - hset post pid:uid JSON_OBJECT

    Get/Check Redis Objects:
    - hget user:uid username|profileURL|smallProfileURL|backgroundURL|description|followers|following
    - hget user:usernameLower uid
        - smembers user:uid:[followers|following]
        - sismember  user:uid:[likes|repost] postID
        - hget post pid:uid
        - zrevrangebyscore user:uid:[hometimeline|usertimeline|liketimeline] [+inf|maxDate] 0 10

*/


CREATE TABLE public.user (
    email citext not null unique,
    username varchar(32) not null unique,
    username_lower varchar(32) not null unique,
    password varchar(100) not null,
    signup_date timestamptz not null,
    profile_img varchar(74) not null,
    small_profile_img varchar(74) not null,
    background_img varchar(74) not null,
    description varchar(250) not null,
    uid serial primary key
);

CREATE TABLE public.post (
    pid integer,
    uid integer references public.user ON DELETE CASCADE,
    message varchar(200) not null,
    date timestamptz not null,
    primary key (pid, uid)
);

CREATE TABLE public.user_following (
    uid integer references public.user ON DELETE CASCADE,
    fid integer references public.user ON DELETE CASCADE,
    primary key (uid, fid)
);


CREATE TABLE public.post_stats (
    pid integer,
    uid integer references public.user ON DELETE CASCADE,
    likes integer not null,
    reposts integer not null,
    comments integer not null,
    foreign key (pid, uid) references public.post,
    primary key (pid, uid)
);

CREATE TABLE public.post_comment (
    op_pid integer,
    op_uid integer references public.user ON DELETE CASCADE,
    comment_pid integer,
    comment_uid integer references public.user ON DELETE CASCADE,
    primary key (op_pid, op_uid, comment_pid, comment_uid),
    foreign key (op_pid, op_uid) references public.post (pid, uid) ON DELETE CASCADE,
    foreign key (comment_pid, comment_uid) references public.post (pid, uid) ON DELETE CASCADE
);

CREATE TABLE public.user_repost (
    uid integer references public.user ON DELETE CASCADE,
    post_pid integer,
    post_uid integer references public.user ON DELETE CASCADE,
    date timestamptz not null,
    primary key (uid, post_pid, post_uid),
    foreign key (post_pid, post_uid) references public.post (pid, uid) ON DELETE CASCADE
);

CREATE TABLE public.user_like (
    uid integer references public.user ON DELETE CASCADE,
    post_pid integer,
    post_uid integer references public.user ON DELETE CASCADE,
    date timestamptz not null,
    primary key (uid, post_pid, post_uid),
    foreign key (post_pid, post_uid) references public.post (pid, uid) ON DELETE CASCADE
);
