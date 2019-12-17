import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import Style from './InfoDialog.less';
import Dialog from '../components/Dialog';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Message from '../components/Message';
import { State, Linkman } from '../state/reducer';
import getFriendId from '../../utils/getFriendId';
import useAction from '../hooks/useAction';
import { addFriend, getLinkmanHistoryMessages, deleteFriend, sealUser } from '../service';

interface UserInfoProps {
    visible: boolean;
    user?: {
        _id: string;
        username: string;
        avatar: string;
    };
    onClose: () => void;
}

function UserInfo(props: UserInfoProps) {
    const { visible, onClose, user } = props;

    const action = useAction();

    const selfId = useSelector((state: State) => state.user && state.user._id) || '';
    // Get friend id
    if (user && user._id.length === selfId.length) {
        user._id = getFriendId(selfId, user._id);
    }
    /** Get original user id */
    const originUserId = user && user._id.replace(selfId, '');

    const linkman = useSelector((state: State) => state.linkmans[user && user._id]);
    const isFriend = linkman && linkman.type === 'friend';
    const isAdmin = useSelector((state: State) => state.user && state.user.isAdmin);
    const [largerAvatar, toggleLargetAvatar] = useState(false);

    if (!user) {
        return null;
    }

    function handleFocusUser() {
        onClose();
        action.setFocus(user._id);
    }

    async function handleAddFriend() {
        const friend = await addFriend(originUserId);
        if (friend) {
            onClose();
            const { _id } = user;
            let existCount = 0;
            if (linkman) {
                existCount = Object.keys(linkman.messages).length;
                action.setLinkmanProperty(_id, 'type', 'friend');
            } else {
                const newLinkman = {
                    _id,
                    from: selfId,
                    to: {
                        _id: originUserId,
                        username: friend.username,
                        avatar: friend.avatar,
                    },
                    type: 'friend',
                    createTime: Date.now(),
                };
                action.addLinkman((newLinkman as unknown) as Linkman, true);
            }
            const messages = await getLinkmanHistoryMessages(_id, existCount);
            if (messages) {
                action.addLinkmanHistoryMessages(_id, messages);
            }
            handleFocusUser();
        }
    }

    async function handleDeleteFriend() {
        const isSuccess = await deleteFriend(originUserId);
        if (isSuccess) {
            onClose();
            action.removeLinkman(user._id);
            Message.success('Successful deletion of friends');
        }
    }

    async function handleSeal() {
        const isSuccess = await sealUser(user.username);
        if (isSuccess) {
            Message.success('User banned successfully');
        }
    }

    return (
        <Dialog className={Style.infoDialog} visible={visible} onClose={onClose}>
            <div>
                {visible && user ? (
                    <div className={Style.coantainer}>
                        <div className={Style.header}>
                            <Avatar
                                size={60}
                                src={user.avatar}
                                onMouseEnter={() => toggleLargetAvatar(true)}
                                onMouseLeave={() => toggleLargetAvatar(false)}
                            />
                            <img
                                className={`${Style.largeAvatar} ${largerAvatar ? 'show' : 'hide'}`}
                                src={user.avatar}
                                alt="Profile"
                            />
                            <p>{user.username}</p>
                        </div>
                        <div className={Style.info}>
                            {isFriend ? (
                                <Button onClick={handleFocusUser}>Send a message</Button>
                            ) : null}
                            {isFriend ? (
                                <Button type="danger" onClick={handleDeleteFriend}>
                                    Delete friend
                                </Button>
                            ) : (
                                <Button onClick={handleAddFriend}>Add to friends</Button>
                            )}
                            {isAdmin ? (
                                <Button type="danger" onClick={handleSeal}>
                                    Ban user
                                </Button>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>
        </Dialog>
    );
}

export default UserInfo;
