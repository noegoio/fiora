import { isMobile } from '../../utils/ua';
import getData from '../localStorage';
import {
    Action,
    ActionTypes,
    SetUserPayload,
    SetStatusPayload,
    AddLinkmanPayload,
    AddLinkmanHistoryMessagesPayload,
    SetLinkmansLastMessagesPayload,
    SetLinkmanPropertyPayload,
    UpdateMessagePayload,
    AddLinkmanMessagePayload,
    UpdateUserInfoPayload,
    DeleteMessagePayload,
} from './action';
import getFriendId from '../../utils/getFriendId';

/** Chat message */
export interface Message {
    _id: string;
    type: string;
    content: string;
    from: {
        _id: string;
        username: string;
        avatar: string;
        originUsername: string;
        tag: string;
    };
    loading: boolean;
    percent: number;
    createTime: string;
}

export interface MessagesMap {
    [messageId: string]: Message;
}

export interface GroupMember {
    user: {
        _id: string;
        username: string;
        avatar: string;
    };
    os: string;
    browser: string;
    environment: string;
}

export interface Group {
    _id: string;
    name: string;
    avatar: string;
    createTime: string;
    creator: string;
    onlineMembers: GroupMember[];
}

export interface Friend {
    _id: string;
    name: string;
    avatar: string;
    createTime: string;
}

export interface Linkman extends Group, User {
    type: string;
    unread: number;
    messages: MessagesMap;
}

export interface LinkmansMap {
    [linkmanId: string]: Linkman;
}

export interface User {
    _id: string;
    username: string;
    avatar: string;
}

/** redux store state */
export interface State {
    user?: {
        _id: string;
        username: string;
        avatar: string;
        tag: string;
        isAdmin: boolean;
    };
    linkmans: LinkmansMap;
    /** Focused contacts */
    focus: string;
    /** Client connection status */
    connect: boolean;
    /** Some status values of the client */
    status: {
        /** Whether to display the login registration box */
        loginRegisterDialogVisible: boolean;
        /** theme */
        theme: string;
        /** Theme main color */
        primaryColor: string;
        /** Theme text main color */
        primaryTextColor: string;
        /** Background image */
        backgroundImage: string;
        /** Enable frosted glass effect */
        aero: boolean;
        /** New message sound prompt switch */
        soundSwitch: boolean;
        /** Sound type */
        sound: string;
        /** New message desktop reminder switch */
        notificationSwitch: boolean;
        /** New message language reading switch */
        voiceSwitch: boolean;
        /** Whether to read messages sent by individuals */
        selfVoiceSwitch: boolean;
        /**
         * User label color mode
         * singleColor: Fixed color
         * fixedColor: The same word is always the same color
         * randomColor: The same word stays the same color in each render
         */
        tagColorMode: string;
        /** Whether to show the sidebar */
        sidebarVisible: boolean;
        /** Whether to display the search + contact list bar */
        functionBarAndLinkmanListVisible: boolean;
    };
}

/**
 * Turn contacts into object structure with _id as key
 * @param linkmans Contact array
 */
function getLinkmansMap(linkmans: Linkman[]) {
    return linkmans.reduce((map: LinkmansMap, linkman) => {
        map[linkman._id] = linkman;
        return map;
    }, {});
}

/**
 * Turn message into object structure with _id as key
 * @param messages Message array
 */
function getMessagesMap(messages: Message[]) {
    return messages.reduce((map: MessagesMap, message) => {
        map[message._id] = message;
        return map;
    }, {});
}

/**
 * Delete pairs of values in an object
 * @param obj target
 * @param keys List of keys to delete
 */
function deleteObjectKeys<T>(obj: T, keys: string[]): T {
    let entries = Object.entries(obj);
    const keysSet = new Set(keys);
    entries = entries.filter((entry) => !keysSet.has(entry[0]));
    return entries.reduce((result: any, entry) => {
        const [k, v] = entry;
        result[k] = v;
        return result;
    }, {});
}

/**
 * Delete a key from an object
 * Calling delete directly to delete key values is said to have poor performance(I did not verify)
 * @param obj target
 * @param key The key to delete
 */
function deleteObjectKey<T>(obj: T, key: string): T {
    return deleteObjectKeys(obj, [key]);
}

/**
 * Initialize contact part public fields
 * @param linkman Contact person
 * @param type Contact type
 */
function initLinkmanFields(linkman: Linkman, type: string) {
    linkman.type = type;
    linkman.unread = 0;
    linkman.messages = {};
}

/**
 * Transformation group data structure
 * @param group Group
 */
function transformGroup(group: Linkman): Linkman {
    initLinkmanFields(group, 'group');
    group.creator = group.creator || '';
    group.onlineMembers = [];
    return group;
}

/**
 * Transform friend data structure
 * @param friend Buddy
 */
function transformFriend(friend: Linkman): Linkman {
    // @ts-ignore
    const { from, to } = friend;
    const transformedFriend = {
        _id: getFriendId(from, to._id),
        name: to.username,
        avatar: to.avatar,
        // @ts-ignore
        createTime: friend.createTime,
    };
    initLinkmanFields((transformedFriend as unknown) as Linkman, 'friend');
    return transformedFriend as Linkman;
}

function transformTemporary(temporary: Linkman): Linkman {
    initLinkmanFields(temporary, 'temporary');
    return temporary;
}

const localStorage = getData();
const initialState: State = {
    user: null,
    linkmans: {},
    focus: '',
    connect: false,
    status: {
        loginRegisterDialogVisible: false,
        theme: localStorage.theme,
        primaryColor: localStorage.primaryColor,
        primaryTextColor: localStorage.primaryTextColor,
        backgroundImage: localStorage.backgroundImage,
        aero: localStorage.aero,
        soundSwitch: localStorage.soundSwitch,
        sound: localStorage.sound,
        notificationSwitch: localStorage.notificationSwitch,
        voiceSwitch: localStorage.voiceSwitch,
        selfVoiceSwitch: localStorage.selfVoiceSwitch,
        tagColorMode: localStorage.tagColorMode,
        sidebarVisible: !isMobile,
        functionBarAndLinkmanListVisible: !isMobile,
    },
};

function reducer(state: State = initialState, action: Action): State {
    switch (action.type) {
        case ActionTypes.Connect: {
            return {
                ...state,
                connect: true,
            };
        }
        case ActionTypes.Disconnect: {
            return {
                ...state,
                connect: false,
            };
        }

        case ActionTypes.SetGuest: {
            const group = action.payload as Linkman;
            transformGroup(group);
            return {
                ...state,
                user: {
                    _id: '',
                    username: '',
                    avatar: '',
                    tag: '',
                    isAdmin: false,
                },
                linkmans: {
                    [group._id]: group,
                },
                focus: group._id,
            };
        }

        case ActionTypes.SetUser: {
            const {
                _id,
                username,
                avatar,
                tag,
                groups,
                friends,
                isAdmin,
            } = action.payload as SetUserPayload;
            // @ts-ignore
            const linkmans: Linkman[] = [
                ...groups.map(transformGroup),
                ...friends.map(transformFriend),
            ];
            linkmans.forEach((linkman) => {
                let existMessages = {};
                if (state.linkmans[linkman._id]) {
                    existMessages = state.linkmans[linkman._id].messages;
                }
                linkman.messages = existMessages;
            });

            // If not logged in, set the focused contact as the first contact
            let { focus } = state;
            if (!state.user && linkmans.length > 0) {
                focus = linkmans[0]._id;
            }

            return {
                ...state,
                user: {
                    _id,
                    username,
                    avatar,
                    tag,
                    isAdmin,
                },
                linkmans: getLinkmansMap(linkmans),
                focus,
            };
        }

        case ActionTypes.UpdateUserInfo: {
            const payload = action.payload as UpdateUserInfoPayload;
            return {
                ...state,
                user: {
                    ...state.user,
                    ...payload,
                },
            };
        }

        case ActionTypes.Logout: {
            return {
                ...initialState,
                status: {
                    ...state.status,
                },
            };
        }

        case ActionTypes.SetAvatar: {
            return {
                ...state,
                user: {
                    ...state.user,
                    avatar: action.payload as string,
                },
            };
        }

        case ActionTypes.SetFocus: {
            const focus = action.payload as string;
            if (!state.linkmans[focus]) {
                console.warn(`ActionTypes.SetFocus Error: 联系人 ${focus} 不存在`);
                return state;
            }

            /**
             * To optimize performance
             * If the target contact has more than 50 old messages, only 50 are retained
             */
            const { messages } = state.linkmans[focus];
            const messageKeys = Object.keys(messages);
            let reserveMessages = messages;
            if (messageKeys.length > 50) {
                reserveMessages = deleteObjectKeys(
                    messages,
                    messageKeys.slice(0, messageKeys.length - 50),
                );
            }

            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [focus]: {
                        ...state.linkmans[focus],
                        messages: reserveMessages,
                        unread: 0,
                    },
                },
                focus,
            };
        }

        case ActionTypes.AddLinkman: {
            const payload = action.payload as AddLinkmanPayload;
            const { linkman } = payload;
            const focus = payload.focus ? linkman._id : state.focus;

            let transformedLinkman = linkman;
            switch (linkman.type) {
                case 'group': {
                    transformedLinkman = transformGroup(linkman);
                    break;
                }
                case 'friend': {
                    transformedLinkman = transformFriend(linkman);
                    break;
                }
                case 'temporary': {
                    transformedLinkman = transformTemporary(linkman);
                    transformedLinkman.unread = 1;
                    break;
                }
                default: {
                    return state;
                }
            }

            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [linkman._id]: transformedLinkman,
                },
                focus,
            };
        }

        case ActionTypes.RemoveLinkman: {
            const linkmans = deleteObjectKey(state.linkmans, action.payload as string);
            const linkmanIds = Object.keys(linkmans);
            const focus = linkmanIds.length > 0 ? linkmanIds[0] : '';
            return {
                ...state,
                linkmans: {
                    ...linkmans,
                },
                focus,
            };
        }

        case ActionTypes.SetLinkmansLastMessages: {
            const linkmanMessages = action.payload as SetLinkmansLastMessagesPayload;
            const { linkmans } = state;
            const newState = { ...state, linkmans: {} };
            Object.keys(linkmanMessages).forEach((linkmanId) => {
                newState.linkmans[linkmanId] = {
                    ...linkmans[linkmanId],
                    messages: {
                        ...linkmans[linkmanId].messages,
                        ...getMessagesMap(linkmanMessages[linkmanId]),
                    },
                };
            });
            return newState;
        }

        case ActionTypes.AddLinkmanHistoryMessages: {
            const payload = action.payload as AddLinkmanHistoryMessagesPayload;
            const messagesMap = getMessagesMap(payload.messages);
            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [payload.linkmanId]: {
                        ...state.linkmans[payload.linkmanId],
                        messages: {
                            ...messagesMap,
                            ...state.linkmans[payload.linkmanId].messages,
                        },
                    },
                },
            };
        }

        case ActionTypes.AddLinkmanMessage: {
            const payload = action.payload as AddLinkmanMessagePayload;
            let { unread } = state.linkmans[payload.linkmanId];
            if (state.focus !== payload.linkmanId) {
                unread++;
            }
            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [payload.linkmanId]: {
                        ...state.linkmans[payload.linkmanId],
                        messages: {
                            ...state.linkmans[payload.linkmanId].messages,
                            [payload.message._id]: payload.message,
                        },
                        unread,
                    },
                },
            };
        }

        case ActionTypes.DeleteMessage: {
            const { linkmanId, messageId } = action.payload as DeleteMessagePayload;
            if (!state.linkmans[linkmanId]) {
                console.warn(`ActionTypes.DeleteMessage Error: 联系人 ${linkmanId} 不存在`);
                return state;
            }

            const messages = deleteObjectKey(state.linkmans[linkmanId].messages, messageId);
            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [linkmanId]: {
                        ...state.linkmans[linkmanId],
                        messages,
                    },
                },
            };
        }

        case ActionTypes.SetLinkmanProperty: {
            const payload = action.payload as SetLinkmanPropertyPayload;
            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [payload.linkmanId]: {
                        ...state.linkmans[payload.linkmanId],
                        [payload.key]: payload.value,
                    },
                },
            };
        }

        case ActionTypes.UpdateMessage: {
            const payload = action.payload as UpdateMessagePayload;

            let messages = {};
            if (payload.value._id) {
                messages = {
                    ...deleteObjectKey(
                        state.linkmans[payload.linkmanId].messages,
                        payload.messageId,
                    ),
                    [payload.value._id]: payload.value,
                };
            } else {
                messages = {
                    ...state.linkmans[payload.linkmanId].messages,
                    [payload.messageId]: {
                        ...state.linkmans[payload.linkmanId].messages[payload.messageId],
                        ...payload.value,
                    },
                };
            }

            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [payload.linkmanId]: {
                        ...state.linkmans[payload.linkmanId],
                        messages,
                    },
                },
            };
        }

        case ActionTypes.SetStatus: {
            const payload = action.payload as SetStatusPayload;
            return {
                ...state,
                status: {
                    ...state.status,
                    [payload.key]: payload.value,
                },
            };
        }

        default:
            return state;
    }
}

export default reducer;
