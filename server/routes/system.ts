import fs from 'fs';
import path from 'path';
import axios from 'axios';
import assert from 'assert';
import { promisify } from 'util';

import {
    getMemoryData,
    MemoryDataStorageKey,
    existMemoryData,
    addMemoryData,
    deleteMemoryData,
} from '../memoryData';

import User from '../models/user';
import Group from '../models/group';

import config from '../../config/server';
import { SealTimeout } from '../../utils/const';
import { KoaContext } from '../../types/koa';

/** Baidu language synthesis token */
let baiduToken = '';
/** Time when the token was last obtained */
let lastBaiduTokenTime = Date.now();

interface SearchData {
    /** Keywords */
    keywords: string;
}

/**
 * Search users and groups
 * @param ctx Context
 */
export async function search(ctx: KoaContext<SearchData>) {
    const { keywords } = ctx.data;
    if (keywords === '') {
        return {
            users: [],
            groups: [],
        };
    }

    const users = await User.find({ username: { $regex: keywords } }, { avatar: 1, username: 1 });
    const groups = await Group.find(
        { name: { $regex: keywords } },
        { avatar: 1, name: 1, members: 1 },
    );

    return {
        users,
        groups: groups.map((group) => ({
            _id: group._id,
            avatar: group.avatar,
            name: group.name,
            members: group.members.length,
        })),
    };
}

interface SearchExpressionData {
    /** Keywords */
    keywords: string;
}

/**
 * Search emoticons, climb other station resources
 * @param ctx Context
 */
export async function searchExpression(ctx: KoaContext<SearchExpressionData>) {
    const { keywords } = ctx.data;
    if (keywords === '') {
        return [];
    }

    const host = 'https://www.b7.cn';
    const res = await axios({
        method: 'get',
        url: `${host}/so/bq/api9.php?page=3&sear=1&keyboard=${encodeURIComponent(keywords)}`,
        headers: {
            referer: 'https://www.b7.cn/so/bq/api9.php',
            'user-agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36',
        },
    });
    assert(res.status === 200, 'Search for emoji package failed, please try again');

    const images = res.data.match(/<img\s+src="[^"']+">/g) || [];
    return images.map((img: string) => {
        const src = img.match(/src="([^"']+)"/);
        if (src) {
            return /^https?:/.test(src[1]) ? src[1] : host + src[1];
        }
        return '';
    });
}

/**
 * Get Baidu language synthesis token
 */
export async function getBaiduToken() {
    if (baiduToken && Date.now() < lastBaiduTokenTime) {
        return { token: baiduToken };
    }

    const res = await axios.get(
        'https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=pw152BzvaSZVwrUf3Z2OHXM6&client_secret=fa273cc704b080e85ad61719abbf7794',
    );
    assert(res.status === 200, 'Request for Baidu token failed');

    baiduToken = res.data.access_token;
    lastBaiduTokenTime = Date.now() + (res.data.expires_in - 60 * 60 * 24) * 1000;
    return { token: baiduToken };
}

interface SealUserData {
    username: string;
}

/**
 * User ban, requires administrator rights
 * @param ctx Context
 */
export async function sealUser(ctx: KoaContext<SealUserData>) {
    const { username } = ctx.data;
    assert(username !== '', 'username cannot be empty');

    const user = await User.findOne({ username });
    assert(user, 'User does not exist');

    const userId = user._id.toString();
    assert(!existMemoryData(MemoryDataStorageKey.SealList, userId), 'User is banned');

    addMemoryData(MemoryDataStorageKey.SealList, userId);
    setTimeout(() => {
        deleteMemoryData(MemoryDataStorageKey.SealList, userId);
    }, SealTimeout);

    return {
        msg: 'ok',
    };
}

/**
 * Get list of banned users, requires administrator rights
 */
export async function getSealList() {
    const sealList = getMemoryData(MemoryDataStorageKey.SealList);
    const userIds = [...sealList.keys()];
    const users = await User.find({ _id: { $in: userIds } });
    const result = users.map((user) => user.username);
    return result;
}

interface UploadFileData {
    /** file name */
    fileName: string;
    /** document content */
    file: any;
}

export async function uploadFile(ctx) {
    assert(
        config.qiniuAccessKey === '' ||
            config.qiniuBucket === '' ||
            config.qiniuBucket === '' ||
            config.qiniuUrlPrefix === '',
        'Qiniu has been configured, please use Qiniu file upload',
    );

    try {
        await promisify(fs.writeFile)(
            path.resolve(__dirname, `../../public/${ctx.data.fileName}`),
            ctx.data.file,
        );
        return {
            url: `/${ctx.data.fileName}`,
        };
    } catch (err) {
        console.error(err);
        return `File upload failed:${err.message}`;
    }
}
