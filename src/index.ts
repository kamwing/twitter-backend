/** Configure environment variables */
import dotenv from 'dotenv';
dotenv.config();

/** Configure timezone */
process.env.TZ = 'Pacific/Auckland';

import Server from './Server';

/** Start express and the HTTP server. */
const server = new Server();
server.start(3000).then(() =>{
    console.log('Server started on port 3000');
});

export default server;

// testing express
// https://github.com/visionmedia/supertest
// proper testing structure/practices
// https://stackoverflow.com/questions/24153261/joining-tests-from-multiple-files-with-mocha-js
// validate request params
// https://express-validator.github.io/docs/check-api.html
// great error handling guide
// https://zellwk.com/blog/express-errors/#:~:text=If%20you%20want%20to%20handle%20an%20asynchronous%20error%2C%20you%20need,handler%20through%20the%20next%20argument.&text=If%20you're%20using%20Async,code%20without%20try%2Fcatch%20blocks.