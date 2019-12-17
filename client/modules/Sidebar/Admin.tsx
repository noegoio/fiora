import React, { useEffect, useState, useCallback } from 'react';

import Style from './Admin.less';
import Common from './Common.less';
import Dialog from '../../components/Dialog';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Message from '../../components/Message';
import { getSealList, resetUserPassword, sealUser, setUserTag } from '../../service';

interface AdminProps {
    visible: boolean;
    onClose: () => void;
}

function Admin(props: AdminProps) {
    const { visible, onClose } = props;

    const [tagUsername, setTagUsername] = useState('');
    const [tag, setTag] = useState('');
    const [resetPasswordUsername, setResetPasswordUsername] = useState('');
    const [sealUsername, setSealUsername] = useState('');
    const [sealList, setSealList] = useState([]);

    /**
     * Get list of banned users
     */
    const handleGetSealList = useCallback(async () => {
        const sealListRes = await getSealList();
        if (sealListRes) {
            setSealList(sealListRes);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            handleGetSealList();
        }
    }, [handleGetSealList, visible]);

    /**
     * Handle updating user tags
     */
    async function handleSetTag() {
        const isSuccess = await setUserTag(tagUsername, tag.trim());
        if (isSuccess) {
            Message.success(
                'User label updated successfully, please refresh the page to update data',
            );
            setTagUsername('');
            setTag('');
        }
    }

    /**
     * Handle resetting user password
     */
    async function handleResetPassword() {
        const res = await resetUserPassword(resetPasswordUsername);
        if (res) {
            Message.success(`The user's password has been reset to:${res.newPassword}`);
            setResetPasswordUsername('');
        }
    }
    /**
     * Handle blocked user actions
     */
    async function handleSeal() {
        const isSuccess = await sealUser(sealUsername);
        if (isSuccess) {
            Message.success('User banned successfully');
            setSealUsername('');
            handleGetSealList();
        }
    }

    return (
        <Dialog className={Style.admin} visible={visible} title="Admin console" onClose={onClose}>
            <div className={Common.container}>
                <div className={Common.block}>
                    <p className={Common.title}>Update user labels</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={`${Style.input} ${Style.tagUsernameInput}`}
                            value={tagUsername}
                            onChange={setTagUsername}
                            placeholder="Username to update tags"
                        />
                        <Input
                            className={`${Style.input} ${Style.tagInput}`}
                            value={tag}
                            onChange={setTag}
                            placeholder="Label content"
                        />
                        <Button className={Style.button} onClick={handleSetTag}>
                            Apply
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Reset user password</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={Style.input}
                            value={resetPasswordUsername}
                            onChange={setResetPasswordUsername}
                            placeholder="Username to reset password"
                        />
                        <Button className={Style.button} onClick={handleResetPassword}>
                            Apply
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Ban user</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={Style.input}
                            value={sealUsername}
                            onChange={setSealUsername}
                            placeholder="Username to ban"
                        />
                        <Button className={Style.button} onClick={handleSeal}>
                            Apply
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>List of blocked users</p>
                    <div className={Style.sealList}>
                        {sealList.map((username) => (
                            <span className={Style.sealUsername} key={username}>
                                {username}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

export default Admin;
