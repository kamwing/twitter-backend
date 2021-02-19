# Twitter Clone Backend

A backend API built to handle lots of users at scale with the help of Redis & PostgreSQL.
- **Live demo:** https://social.gabe.nz
- **Frontend:** https://github.com/gabeburnett/twitter-frontend

## System Design
Since this Twitter clone is read heavy, I have focused on caching timelines, posts and user profiles.

### Requesting timelines

<img src="https://i.imgur.com/TMhHBoO.png" alt="Image of requesting a timeline" width="420px">

### Creating a new post

<img src="https://i.imgur.com/XAfdEMf.png" alt="Image of creating a post" height="350px">

### Liking a post

![Image of liking a post](https://i.imgur.com/vUGsg3G.png)

## Endpoints

### Authorizing requests
Every request must have a header with the format 'Authorization: Bearer JWT_TOKEN_FROM_COOKIE', except for login or register requests.

### POST /api/auth/login
Sends login details for verification and if successful, responds with a new JWT token and username as cookies.

**Parameters**
| Name       | Required | Type   | Description                    |
|------------|----------|--------|--------------------------------|
| `email`    | required | string | Email of a registered account. |
| `password` | required | string | A valid matching password.     |

### POST /api/auth/register
Sends details for a new account, checks if the email and username are available then creates the new account.

**Parameters**
| Name       | Required | Type   | Description                    |
|------------|----------|--------|--------------------------------|
| `email`    | required | string | A valid email address that isn't assigned to an existing account. |
| `username` | required | string | A unique alphanumeric username. |
| `password` | required | string | A password that is at least six characters long. |

### GET /api/post
Gets all the contents of a post and a few comments.

**Parameters**
| Name       | Required | Type   | Description                    |
|------------|----------|--------|--------------------------------|
| `pid`  | required | string | The ID of a post from the given username's profile. |
| `username`  | required | string | Username of an exisiting user. |
| `lastDate`  | optional | ISO 8601 date with a time zone designator | Every comment returned will be posted during or after this date. |

**Response**
```
{
    "op":
        {
            "pid":50,
            "uid":1,
            "username":"Gabe",
            "profileURL":"https://social.gabe.nz/api/img/1-profile-small.png",
            "date":"Jan 11",
            "message":"asdhbasdasd",
            "likes":0,
            "reposts":0,
            "comments":1,
            "hasLiked":false,
            "hasReposted":false,
            "rawDate":"2021-01-11T05:33:36.070Z"
        },
    "comments":
    [
        {
            "pid":51,
            "uid":1,
            "username":"Gabe",
            "profileURL":"https://social.gabe.nz/api/img/1-profile-small.png",
            "date":"Jan 12",
            "message":"testing",
            "likes":"0",
            "reposts":"0",
            "comments":"2",
            "hasLiked":false,
            "hasReposted":false,
            "rawDate":"2021-01-12T02:47:10.166Z"}
      ]
}
```

### GET /api/post/create
Creates a new post on the user's profile.

**Parameters**
| Name       | Required | Type   | Description                    |
|------------|----------|--------|--------------------------------|
| `message`  | required | string | A non-empty message. |

### GET /api/post/create/comment
Creates a new comment in reply to someones post.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `message` | required | string | A non-empty message. |
| `pid` | required | number | The ID of the post being replied to. |
| `uid` | required | number | The ID of the user being replied to. |

### GET /api/post/like
Likes a post, and adds it to the liker's like timeline.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `pid` | required | number | The ID of the post being liked. |
| `uid` | required | number | The ID of the user being liked. |

### GET /api/post/unlike
Unlikes a post, and removes it from the liker's like timeline.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `pid` | required | number | The ID of the post being unliked. |
| `uid` | required | number | The ID of the user being unliked. |

### GET /api/post/repost
Reposts a post, and adds it to the reposter's profile timeline and all follower home timelines.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `pid` | required | number | The ID of the post being liked. |
| `uid` | required | number | The ID of the user being liked. |

### GET /api/post/unrepost
Unreposts a post, and removes it from the reposter's profile timeline and all follower home timelines.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `pid` | required | number | The ID of the post being unliked. |
| `uid` | required | number | The ID of the user being unliked. |

### GET /api/profile
Gets a user's profile description, images and follower count.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `username` | required | string | Username of the profile being requested. |

**Response**
```
{
    "username":"Gabe",
    "profileURL":https://social.gabe.nz/api/img/1-profile.png",
    "backgroundURL":"https://social.gabe.nz/api/img/1-background.png",
    "description":"my amazing profile desc",
    "followers":"0",
    "following":false
}
```

### GET /api/profile/posts
Gets a user's post timeline, and checks if the viewing user has liked/reposted any of the posts.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `username` | required | string | Username of the timeline being requested. |
| `lastDate`  | optional | ISO 8601 date with a time zone designator | Every post returned will be posted during or after this date. |

**Response**
```
[
    {
        "pid":53,
        "uid":1,
        "username":"Gabe",
        "profileURL":"https//social.gabe.nz/api/img/1-profile-small.png",
        "date":"Feb 9",
        "message":"example message\n",
        "likes":0,
        "reposts":0,
        "comments":0,
        "hasLiked":false,
        "hasReposted":false,
        "rawDate":"2021-02-10T00:01:59.046Z"
    }
]
```

### GET /api/profile/likes
Gets a user's like timeline, and checks if the viewing user has liked/reposted any of the posts.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `username` | required | string | Username of the timeline being requested. |
| `lastDate`  | optional | ISO 8601 date with a time zone designator | Every post returned will be liked during or after this date. |

**Response**
```
[
    {
        "pid":53,
        "uid":1,
        "username":"Gabe",
        "profileURL":"https//social.gabe.nz/api/img/1-profile-small.png",
        "date":"Feb 9",
        "message":"example message\n",
        "likes":0,
        "reposts":0,
        "comments":0,
        "hasLiked":false,
        "hasReposted":false,
        "rawDate":"2021-02-10T00:01:59.046Z"
    }
]
```

### GET /api/profile/follow
Adds you to the given user's follower list.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `username` | required | string | Username of the profile being followed. |

### GET /api/profile/unfollow
Removes you from the given user's follower list.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `username` | required | string | Username of the profile being unfollowed. |

### GET /api/profile/update
Update your profile's description, images or change your username. If a new username is given and is unique, it will respond with a new username cookie.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `username` | optional | string | A new unique username. |
| `description` | optional | string | A new description. |
| `profile` | optional | image | A new profile image. |
| `background` | optional | image | A new profile background image. |

### GET /api/timeline
Gets a user's like timeline, and checks if the viewing user has liked/reposted any of the posts.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `lastDate`  | optional | ISO 8601 date with a time zone designator | Every post returned will be posted during or after this date. |

**Response**
```
[
    {
        "pid":53,
        "uid":1,
        "username":"Gabe",
        "profileURL":"https//social.gabe.nz/api/img/1-profile-small.png",
        "date":"Feb 9",
        "message":"example message\n",
        "likes":0,
        "reposts":0,
        "comments":0,
        "hasLiked":false,
        "hasReposted":false,
        "rawDate":"2021-02-10T00:01:59.046Z"
    }
]
```

### GET /api/search
Search for posts containing the given keywords, and check if the viewing user has liked/reposted any of the returned posts.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `keywords` | required | string | One or more keywords used to search for posts. |
| `lastDate`  | optional | ISO 8601 date with a time zone designator | Every post returned will be posted during or after this date. |

**Response**
```
[
    {
        "pid":53,
        "uid":1,
        "username":"Gabe",
        "profileURL":"https//social.gabe.nz/api/img/1-profile-small.png",
        "date":"Feb 9",
        "message":"one of many posts containing the keywords\n",
        "likes":0,
        "reposts":0,
        "comments":0,
        "hasLiked":false,
        "hasReposted":false,
        "rawDate":"2021-02-10T00:01:59.046Z"
    }
]
```