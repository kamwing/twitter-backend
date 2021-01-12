import server from '../src/index';

interface IUser {
    username: string;
    email: string;
    password: string;
    jwtToken: string | null;
};

const userJohn: IUser = {
    username: "John",
    email: "john@example.com",
    password: "averyhardpassword",
    jwtToken: null
};

const userBob: IUser = {
    username: "Bob",
    email: "Bob@example.com",
    password: "bobshardpassword",
    jwtToken: null
};

export = { server, userJohn, userBob };