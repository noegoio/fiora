import bcrypt from 'bcryptjs';
import assert from 'assert';
import jwt from 'jwt-simple';
import { Types } from 'mongoose';
import { promisify } from 'util';

import { addMemoryData, MemoryDataStorageKey, deleteMemoryData } from '../memoryData';

import User, { UserDocument } from '../models/user';
import Group from '../models/group';
import Friend from '../models/friend';
import Socket from '../models/socket';
import Message from '../models/message';

import config from '../../config/server';
import getRandomAvatar from '../../utils/getRandomAvatar';
import { KoaContext } from '../../types/koa';

const { isValid } = Types.ObjectId;

/** Encrypted salt digits */
const saltRounds = 10;

/** Day time */
const OneDay = 1000 * 60 * 60 * 24;

interface Environment {
    /** Client system */
    os: string;
    /** Client browser */
    browser: string;
    /** Client environment information */
    environment: string;
}

/**
 * Generate jwt token
 * @param user user
 * @param environment Client environment information
 */
function generateToken(user: string, environment: string) {
    return jwt.encode(
        {
            user,
            environment,
            expires: Date.now() + config.tokenExpiresTime,
        },
        config.jwtSecret,
    );
}

/**
 * Handle users who have been registered for less than 24 hours
 * @param user
 */
function handleNewUser(user: UserDocument) {
    // Add user to new user list, delete after 24 hours
    if (Date.now() - user.createTime.getTime() < OneDay) {
        const userId = user._id.toString();
        addMemoryData(MemoryDataStorageKey.NewUserList, userId);
        setTimeout(() => {
            deleteMemoryData(MemoryDataStorageKey.NewUserList, userId);
        }, OneDay);
    }
}

interface RegisterData extends Environment {
    /** username */
    username: string;
    /** user password */
    password: string;
}

/**
 * Register new user
 * @param ctx Context
 */
export async function register(ctx: KoaContext<RegisterData>) {
    const { username, password, os, browser, environment } = ctx.data;
    assert(username, 'Username can not be empty');
    assert(password, 'password can not be blank');

    const user = await User.findOne({ username });
    assert(!user, 'The username already exists');

    const defaultGroup = await Group.findOne({ isDefault: true });
    assert(defaultGroup, 'Default group does not exist');

    const salt = await promisify(bcrypt.genSalt)(saltRounds);
    const hash = await promisify(bcrypt.hash)(password, salt);

    let newUser = null;
    try {
        newUser = await User.create({
            username,
            salt,
            password: hash,
            avatar: getRandomAvatar(),
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            return 'Username contains unsupported characters or is longer than the limit';
        }
        throw err;
    }

    handleNewUser(newUser);

    if (!defaultGroup.creator) {
        defaultGroup.creator = newUser;
    }
    defaultGroup.members.push(newUser);
    await defaultGroup.save();

    const token = generateToken(newUser._id, environment);

    ctx.socket.user = newUser._id;
    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            user: newUser._id,
            os,
            browser,
            environment,
        },
    );

    return {
        _id: newUser._id,
        avatar: newUser.avatar,
        username: newUser.username,
        groups: [
            {
                _id: defaultGroup._id,
                name: defaultGroup.name,
                avatar: defaultGroup.avatar,
                creator: defaultGroup.creator._id,
                createTime: defaultGroup.createTime,
                messages: [],
            },
        ],
        friends: [],
        token,
        isAdmin: false,
    };
}

type LoginData = RegisterData;

/**
 * Account Login
 * @param ctx Context
 */
export async function login(ctx: KoaContext<LoginData>) {
    assert(!ctx.socket.user, 'You are already logged in');

    const { username, password, os, browser, environment } = ctx.data;
    assert(username, 'Username can not be empty');
    assert(password, 'password can not be blank');

    const user = await User.findOne({ username });
    assert(user, 'this user does not exist');

    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    assert(isPasswordCorrect, 'wrong password');

    handleNewUser(user);

    user.lastLoginTime = new Date();
    await user.save();

    const groups = await Group.find(
        { members: user },
        {
            _id: 1,
            name: 1,
            avatar: 1,
            creator: 1,
            createTime: 1,
        },
    );
    groups.forEach((group) => {
        ctx.socket.join(group._id.toString());
    });

    const friends = await Friend.find({ from: user._id }).populate('to', {
        avatar: 1,
        username: 1,
    });

    const token = generateToken(user._id.toString(), environment);

    ctx.socket.user = user._id;
    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            user: user._id,
            os,
            browser,
            environment,
        },
    );

    return {
        _id: user._id,
        avatar: user.avatar,
        username: user.username,
        tag: user.tag,
        groups,
        friends,
        token,
        isAdmin: user._id.toString() === config.administrator,
    };
}

interface LoginByTokenData extends Environment {
    /** Login token */
    token: string;
}

/**
 * token login
 * @param ctx Context
 */
export async function loginByToken(ctx: KoaContext<LoginByTokenData>) {
    assert(!ctx.socket.user, 'You are already logged in');

    const { token, os, browser, environment } = ctx.data;
    assert(token, 'token cannot be empty');

    let payload = null;
    try {
        payload = jwt.decode(token, config.jwtSecret);
    } catch (err) {
        return 'Illegal token';
    }

    assert(Date.now() < payload.expires, 'token has expired');
    assert.equal(environment, payload.environment, 'Illegal login');

    const user = await User.findOne(
        { _id: payload.user },
        {
            _id: 1,
            avatar: 1,
            username: 1,
            tag: 1,
            createTime: 1,
        },
    );
    assert(user, 'User does not exist');

    handleNewUser(user);

    user.lastLoginTime = new Date();
    await user.save();

    const groups = await Group.find(
        { members: user },
        {
            _id: 1,
            name: 1,
            avatar: 1,
            creator: 1,
            createTime: 1,
        },
    );
    groups.forEach((group) => {
        ctx.socket.join(group._id.toString());
    });

    const friends = await Friend.find({ from: user._id }).populate('to', {
        avatar: 1,
        username: 1,
    });

    ctx.socket.user = user._id;
    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            user: user._id,
            os,
            browser,
            environment,
        },
    );

    return {
        _id: user._id,
        avatar: user.avatar,
        username: user.username,
        tag: user.tag,
        groups,
        friends,
        isAdmin: user._id.toString() === config.administrator,
    };
}

/**
 * Visitor login, can only get the default group information
 * @param ctx Context
 */
export async function guest(ctx: KoaContext<Environment>) {
    const { os, browser, environment } = ctx.data;

    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            os,
            browser,
            environment,
        },
    );

    const group = await Group.findOne(
        { isDefault: true },
        {
            _id: 1,
            name: 1,
            avatar: 1,
            createTime: 1,
            creator: 1,
        },
    );
    ctx.socket.join(group._id.toString());

    const messages = await Message.find(
        { to: group._id },
        {
            type: 1,
            content: 1,
            from: 1,
            createTime: 1,
        },
        { sort: { createTime: -1 }, limit: 15 },
    ).populate('from', { username: 1, avatar: 1 });
    messages.reverse();

    return { messages, ...group.toObject() };
}

interface ChangeAvatarData {
    /** New avatar */
    avatar: string;
}

/**
 * Modify user avatar
 * @param ctx Context
 */
export async function changeAvatar(ctx: KoaContext<ChangeAvatarData>) {
    const { avatar } = ctx.data;
    assert(avatar, 'New avatar link cannot be empty');

    await User.updateOne(
        { _id: ctx.socket.user },
        {
            avatar,
        },
    );

    return {};
}

interface AddFriendData {
    userId: string;
}

/**
 * Add friend, add one way
 * @param ctx Context
 */
export async function addFriend(ctx: KoaContext<AddFriendData>) {
    const { userId } = ctx.data;
    assert(isValid(userId), 'Invalid user id');
    assert(ctx.socket.user.toString() !== userId, "Can't add yourself as a friend");

    const user = await User.findOne({ _id: userId });
    assert(user, 'Add friend failed, user does not exist');

    const friend = await Friend.find({ from: ctx.socket.user, to: user._id });
    assert(friend.length === 0, 'You are already friends');

    const newFriend = await Friend.create({
        from: ctx.socket.user,
        to: user._id,
    });

    return {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        from: newFriend.from,
        to: newFriend.to,
    };
}

interface AddFriendData {
    userId: string;
}

/**
 * Delete friend, one-way delete
 * @param ctx Context
 */
export async function deleteFriend(ctx: KoaContext<AddFriendData>) {
    const { userId } = ctx.data;
    assert(isValid(userId), 'Invalid user id');

    const user = await User.findOne({ _id: userId });
    assert(user, 'User does not exist');

    await Friend.deleteOne({ from: ctx.socket.user, to: user._id });
    return {};
}

interface ChangePasswordData {
    /** old password */
    oldPassword: string;
    /** new password */
    newPassword: string;
}

/**
 * Modify user password
 * @param ctx Context
 */
export async function changePassword(ctx: KoaContext<ChangePasswordData>) {
    const { oldPassword, newPassword } = ctx.data;
    assert(newPassword, 'New password cannot be empty');
    assert(oldPassword !== newPassword, 'The new password cannot be the same as the old password');

    const user = await User.findOne({ _id: ctx.socket.user });
    const isPasswordCorrect = bcrypt.compareSync(oldPassword, user.password);
    assert(isPasswordCorrect, 'Old password is incorrect');

    const salt = await promisify(bcrypt.genSalt)(saltRounds);
    const hash = await promisify(bcrypt.hash)(newPassword, salt);

    user.password = hash;
    await user.save();

    return {
        msg: 'ok',
    };
}

interface ChangeUsernameData {
    /** 新用户名 */
    username: string;
}

/**
 * Modify username
 * @param ctx Context
 */
export async function changeUsername(ctx: KoaContext<ChangeUsernameData>) {
    const { username } = ctx.data;
    assert(username, 'New username cannot be empty');

    const user = await User.findOne({ username });
    assert(!user, 'The username already exists, try another one ');

    const self = await User.findOne({ _id: ctx.socket.user });

    self.username = username;
    await self.save();

    return {
        msg: 'ok',
    };
}

type ResetUserPasswordData = ChangeUsernameData;

/**
 * Reset user password, requires administrator rights
 * @param ctx Context
 */
export async function resetUserPassword(ctx: KoaContext<ResetUserPasswordData>) {
    const { username } = ctx.data;
    assert(username !== '', 'username cannot be empty');

    const user = await User.findOne({ username });
    assert(user, 'User does not exist');

    const newPassword = 'helloworld';
    const salt = await promisify(bcrypt.genSalt)(saltRounds);
    const hash = await promisify(bcrypt.hash)(newPassword, salt);

    user.salt = salt;
    user.password = hash;
    await user.save();

    return {
        newPassword,
    };
}

interface SetUserTagData {
    username: string;
    tag: string;
}

/**
 * Update user tags, requires administrator rights
 * @param ctx Context
 */
export async function setUserTag(ctx: KoaContext<SetUserTagData>) {
    const { username, tag } = ctx.data;
    assert(username !== '', 'username cannot be empty');
    assert(tag !== '', 'tag cannot be empty');
    assert(
        /^([0-9a-zA-Z]{1,2}|[\u4e00-\u9eff]){1,5}$/.test(tag),
        'The label does not meet the requirements, allowing 5 Chinese characters or 10 letters',
    );

    const user = await User.findOne({ username });
    assert(user, 'User does not exist');

    user.tag = tag;
    await user.save();

    const sockets = await Socket.find({ user: user._id });
    sockets.forEach((socket) => {
        ctx._io.to(socket.id).emit('changeTag', user.tag);
    });

    return {
        msg: 'ok',
    };
}
