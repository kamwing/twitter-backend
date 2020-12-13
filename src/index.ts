import dotenv from 'dotenv';
dotenv.config();

import Server from './server';

const server = new Server();
server.start(3000).then(() => console.log("server started on port 3000"));

/* 
 * routes: link controller functions to url routes
 * controllers: logic for each route
 * models: database management
 * 
 * database: https://medium.com/nsoft/building-and-running-nodejs-typescript-postgresql-application-with-docker-3878240a2f73
 * postgresql commands: https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-16-04
 * 
 * jwt: https://medium.com/javascript-in-plain-english/verifying-json-web-tokens-with-express-jwt-1ae147aa9bd3
 * 
 * Routes: 
 * /api/auth/login
 * /api/auth/register
 * /api/auth/logout
 * 
 * /api/profile
 * /api/profile/follow
 * /api/profile/posts
 * /api/profile/liked-posts
 * /api/profile/media-posts
 * 
 * /api/post/view
 * /api/post/replies
 * /api/post/like
 * /api/post/repost
 * 
 * /api/search/popular
 * /api/search/latest
 * /api/search/media
 * 
 * /api/timeline
 * 
 * /api/create-post
 */