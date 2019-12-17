import assert from 'assert';
import { Types } from 'mongoose';

import User from '../models/user';
import Group from '../models/group';
import Message from '../models/message';
import Socket from '../models/socket';

import xss from '../../utils/xss';
import { KoaContext } from '../../types/koa';

const { isValid } = Types.ObjectId;

/** Number of historical messages obtained for the first time */
const FirstTimeMessagesCount = 15;
/** The number of historical messages obtained by each call to the interface */
const EachFetchMessagesCount = 30;

/** Rock-paper-scissors, for randomly generating results */
const RPS = ['石头', '剪刀', '布'];

interface SendMessageData {
    /** Message destination */
    to: string;
    /** Message type */
    type: string;
    /** Message content */
    content: string;
}

/**
 * Send a message
 * If sent to a group, to is the group id
 * If it is sent to an individual, to is the value of the two people's id after concatenation in
 * order of size
 *
 * @param ctx Context
 */
export async function sendMessage(ctx: KoaContext<SendMessageData>) {
    const { to, content } = ctx.data;
    let { type } = ctx.data;
    assert(to, 'to cannot be empty');

    let groupId = '';
    let userId = '';
    if (isValid(to)) {
        groupId = to;
        const group = await Group.findOne({ _id: to });
        assert(group, 'Group does not exist');
    } else {
        userId = to.replace(ctx.socket.user.toString(), '');
        assert(isValid(userId), 'Invalid user ID');
        const user = await User.findOne({ _id: userId });
        assert(user, 'User does not exist');
    }

    let messageContent = content;
    if (type === 'text') {
        assert(messageContent.length <= 2048, 'Message length is too long');

        const rollRegex = /^-roll( ([0-9]*))?$/;
        if (rollRegex.test(messageContent)) {
            const regexResult = rollRegex.exec(messageContent);
            if (regexResult) {
                let numberStr = regexResult[1] || '100';
                if (numberStr.length > 5) {
                    numberStr = '99999';
                }
                const number = parseInt(numberStr, 10);
                type = 'system';
                messageContent = JSON.stringify({
                    command: 'roll',
                    value: Math.floor(Math.random() * (number + 1)),
                    top: number,
                });
            }
        } else if (/^-rps$/.test(messageContent)) {
            type = 'system';
            messageContent = JSON.stringify({
                command: 'rps',
                value: RPS[Math.floor(Math.random() * RPS.length)],
            });
        }
        messageContent = xss(messageContent);
    } else if (type === 'invite') {
        const group = await Group.findOne({ name: content });
        assert(group, 'Target group does not exist');

        const user = await User.findOne({ _id: ctx.socket.user });
        messageContent = JSON.stringify({
            inviter: user.username,
            groupId: group._id,
            groupName: group.name,
        });
    }

    const message = await Message.create({
        from: ctx.socket.user,
        to,
        type,
        content: messageContent,
    });

    const user = await User.findOne({ _id: ctx.socket.user }, { username: 1, avatar: 1, tag: 1 });
    const messageData = {
        _id: message._id,
        createTime: message.createTime,
        from: user.toObject(),
        to,
        type,
        content: messageContent,
    };

    if (groupId) {
        ctx.socket.to(groupId).emit('message', messageData);
    } else {
        const sockets = await Socket.find({ user: userId });
        sockets.forEach((socket) => {
            ctx._io.to(socket.id).emit('message', messageData);
        });
        const selfSockets = await Socket.find({ user: ctx.socket.user });
        selfSockets.forEach((socket) => {
            if (socket.id !== ctx.socket.id) {
                ctx._io.to(socket.id).emit('message', messageData);
            }
        });
    }

    return messageData;
}

interface GetLinkmanLastMessagesData {
    /** Contact id list */
    linkmans: string[];
}

/**
 * Get last history message for a group of contacts
 * @param ctx Context
 */
export async function getLinkmansLastMessages(ctx: KoaContext<GetLinkmanLastMessagesData>) {
    const { linkmans } = ctx.data;
    assert(Array.isArray(linkmans), '参数linkmans应该是Array');

    const promises = linkmans.map(
        (linkmanId) =>
            Message.find(
                { to: linkmanId },
                {
                    type: 1,
                    content: 1,
                    from: 1,
                    createTime: 1,
                },
                { sort: { createTime: -1 }, limit: FirstTimeMessagesCount },
            ).populate('from', { username: 1, avatar: 1, tag: 1 }),
        null,
    );
    const results = await Promise.all(promises);
    const messages = linkmans.reduce((result, linkmanId, index) => {
        result[linkmanId] = ((results[index] || []) as Array<unknown>).reverse();
        return result;
    }, {});

    return messages;
}

interface GetLinkmanHistoryMessagesData {
    /** Contact id */
    linkmanId: string;
    /** The number of historical messages that the client currently has */
    existCount: number;
}

/**
 * Get contact history
 * @param ctx Context
 */
export async function getLinkmanHistoryMessages(ctx: KoaContext<GetLinkmanHistoryMessagesData>) {
    const { linkmanId, existCount } = ctx.data;

    const messages = await Message.find(
        { to: linkmanId },
        {
            type: 1,
            content: 1,
            from: 1,
            createTime: 1,
        },
        { sort: { createTime: -1 }, limit: EachFetchMessagesCount + existCount },
    ).populate('from', { username: 1, avatar: 1, tag: 1 });
    const result = messages.slice(existCount).reverse();
    return result;
}

interface GetDefaultGroupHistoryMessagesData {
    /** The number of historical messages that the client currently has */
    existCount: number;
}

/**
 * Get history messages for the default group
 * @param ctx Context
 */
export async function getDefalutGroupHistoryMessages(
    ctx: KoaContext<GetDefaultGroupHistoryMessagesData>,
) {
    const { existCount } = ctx.data;

    const group = await Group.findOne({ isDefault: true });
    const messages = await Message.find(
        { to: group._id },
        {
            type: 1,
            content: 1,
            from: 1,
            createTime: 1,
        },
        { sort: { createTime: -1 }, limit: EachFetchMessagesCount + existCount },
    ).populate('from', { username: 1, avatar: 1, tag: 1 });
    const result = messages.slice(existCount).reverse();
    return result;
}

interface DeleteMessageData {
    /** Message id */
    messageId: string;
}

/**
 * Delete message, requires administrator rights
 */
export async function deleteMessage(ctx: KoaContext<DeleteMessageData>) {
    const { messageId } = ctx.data;

    const message = await Message.findOne({ _id: messageId });
    assert(message, '消息不存在');

    await message.remove();

    /**
     * Broadcast delete message notification, distinguish between group messages and
     * private chat messages
     */
    const messageName = 'deleteMessage';
    const messageData = {
        linkmanId: message.to.toString(),
        messageId,
    };
    if (isValid(message.to)) {
        // Group message
        ctx.socket.to(message.to).emit(messageName, messageData);
    } else {
        // Private chat message
        const targetUserId = message.to.replace(ctx.socket.user.toString(), '');
        const sockets = await Socket.find({ user: targetUserId });
        sockets.forEach((socket) => {
            ctx._io.to(socket.id).emit(messageName, messageData);
        });
        const selfSockets = await Socket.find({ user: ctx.socket.user });
        selfSockets.forEach((socket) => {
            if (socket.id !== ctx.socket.id) {
                ctx._io.to(socket.id).emit(messageName, messageData);
            }
        });
    }

    return {
        msg: 'ok',
    };
}
