# Twitter Clone Backend

A backend API built to handle lots of users at scale with the help of Redis & PostgreSQL.
- **Live demo:** https://social.gabe.nz
- **Frontend:** https://github.com/gabeburnett/twitter-frontend

## System Design
Since this Twitter clone is read heavy, I have focused on caching timelines, posts and user profiles.

### Requesting timelines

<img src="https://i.imgur.com/TMhHBoO.png" alt="Image of requesting a timeline" width="420px">

### Creating a new post

<img src="https://i.imgur.com/LOB4MxG.png" alt="Image of creating a post" height="380px">

### Liking a post

![Image of liking a post](https://i.imgur.com/NUzwn2b.png)

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

### GET /api/post/:pid/:username
Gets all the contents of a post and a few comments.

**Parameters**
| Name       | Required | Type   | Description                    |
|------------|----------|--------|--------------------------------|
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

### POST /api/post
Creates a new post on the user's profile.

**Parameters**
| Name       | Required | Type   | Description                    |
|------------|----------|--------|--------------------------------|
| `message`  | required | string | A non-empty message. |

### POST /api/post/:pid/:uid/comment
Creates a new comment in reply to someones post.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `message` | required | string | A non-empty message. |

### POST /api/post/:pid/:uid/like
Likes a post, and adds it to the liker's like timeline.

### DELETE /api/post/:pid/:uid/like
Unlikes a post, and removes it from the liker's like timeline.

### POST /api/post/:pid/:uid/repost
Reposts a post, and adds it to the reposter's profile timeline and all follower home timelines.

### DELETE /api/post/:pid/:uid/repost
Unreposts a post, and removes it from the reposter's profile timeline and all follower home timelines.

### GET /api/user/:username
Gets a user's profile description, images and follower count.

### POST /api/user/:username
Update your profile's description, images or change your username. If a new username is given and is unique, it will respond with a new username cookie.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
| `username` | optional | string | A new unique username. |
| `description` | optional | string | A new description. |
| `profile` | optional | image | A new profile image. |
| `background` | optional | image | A new profile background image. |

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

### GET /api/user/:username/posts
Gets a user's post timeline, and checks if the viewing user has liked/reposted any of the posts.

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
        "message":"example message",
        "likes":0,
        "reposts":0,
        "comments":0,
        "hasLiked":false,
        "hasReposted":false,
        "rawDate":"2021-02-10T00:01:59.046Z"
    }
]
```

### GET /api/user/:username/likes
Gets a user's like timeline, and checks if the viewing user has liked/reposted any of the posts.

**Parameters**
| Name      | Required | Type   | Description                    |
|-----------|----------|--------|--------------------------------|
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
        "message":"example message",
        "likes":0,
        "reposts":0,
        "comments":0,
        "hasLiked":false,
        "hasReposted":false,
        "rawDate":"2021-02-10T00:01:59.046Z"
    }
]
```

### POST /api/user/:username/follow
Adds you to the given user's follower list.

### DELETE /api/user/:username/follow
Removes you from the given user's follower list.

### GET /api/timeline
Get a user's home timeline, and checks if the user has liked/reposted any of the retrieved posts.

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
        "message":"example message",
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
Search for posts containing the given keywords, and checks if the user has liked/reposted any of the retrieved posts.

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
        "message":"one of many posts containing the keywords",
        "likes":0,
        "reposts":0,
        "comments":0,
        "hasLiked":false,
        "hasReposted":false,
        "rawDate":"2021-02-10T00:01:59.046Z"
    }
]
```