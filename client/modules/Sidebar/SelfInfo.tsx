import React, { useState, useRef } from 'react';
import ReactLoading from 'react-loading';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

import { useSelector } from 'react-redux';
import Dialog from '../../components/Dialog';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { State } from '../../state/reducer';
import readDiskFile from '../../../utils/readDiskFile';
import uploadFile from '../../../utils/uploadFile';
import config from '../../../config/client';
import Message from '../../components/Message';
import { changeAvatar, changePassword, changeUsername } from '../../service';
import useAction from '../../hooks/useAction';
import socket from '../../socket';

import Style from './SelfInfo.less';
import Common from './Common.less';

interface SelfInfoProps {
    visible: boolean;
    onClose: () => void;
}

function SelfInfo(props: SelfInfoProps) {
    const { visible, onClose } = props;

    const action = useAction();
    const userId = useSelector((state: State) => state.user._id);
    const avatar = useSelector((state: State) => state.user.avatar);
    const primaryColor = useSelector((state: State) => state.status.primaryColor);
    const [loading, toggleLoading] = useState(false);
    const [cropper, setCropper] = useState({
        enable: false,
        src: '',
        ext: '',
    });
    const $cropper = useRef(null);

    async function uploadAvatar(blob: Blob, ext = 'png') {
        toggleLoading(true);

        try {
            const avatarUrl = await uploadFile(
                blob,
                `Avatar/${userId}_${Date.now()}`,
                `Avatar_${userId}_${Date.now()}.${ext}`,
            );
            const isSuccess = await changeAvatar(avatarUrl);
            if (isSuccess) {
                action.setAvatar(URL.createObjectURL(blob));
                Message.success('Modify avatar successfully');
            }
        } catch (err) {
            console.error(err);
            Message.error('Failed to upload avatar');
        } finally {
            toggleLoading(false);
            setCropper({ enable: false, src: '', ext: '' });
        }
    }

    async function selectAvatar() {
        const file = await readDiskFile('blob', 'image/png,image/jpeg,image/gif');
        if (!file) {
            return;
        }
        if (file.length > config.maxAvatarSize) {
            // eslint-disable-next-line consistent-return
            return Message.error(
                'Failed to set the avatar, please select a picture smaller than 1MB',
            );
        }

        // Gif avatars do not need to be cropped
        if (file.ext === 'gif') {
            uploadAvatar(file.result as Blob, file.ext);
        } else {
            // Show avatar crop
            const reader = new FileReader();
            reader.readAsDataURL(file.result as Blob);
            reader.onloadend = () => {
                setCropper({
                    enable: true,
                    src: reader.result as string,
                    ext: file.ext,
                });
            };
        }
    }

    function handleChangeAvatar() {
        $cropper.current.getCroppedCanvas().toBlob(async (blob) => {
            uploadAvatar(blob, cropper.ext);
        });
    }

    function reLogin(message: string) {
        action.logout();
        window.localStorage.removeItem('token');
        Message.success(message);
        socket.disconnect();
        socket.connect();
    }

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    async function handleChangePassword() {
        const isSuccess = await changePassword(oldPassword, newPassword);
        if (isSuccess) {
            onClose();
            reLogin('Password changed successfully, please login again with new password');
        }
    }

    const [username, setUsername] = useState('');

    /**
     * Modify username
     */
    async function handleChangeUsername() {
        const isSuccess = await changeUsername(username);
        if (isSuccess) {
            onClose();
            reLogin('User name changed successfully, please login again with new user name');
        }
    }

    function handleCloseDialog(event) {
        /**
         * Click the close button, or click the mask when the image is not cropped, to close the pop-up window
         */
        if (event.target.className === 'rc-dialog-close-x' || !cropper.enable) {
            onClose();
        }
    }

    return (
        <Dialog
            className={Style.selfInfo}
            visible={visible}
            title="Personal information settings"
            onClose={handleCloseDialog}
        >
            <div className={Common.container}>
                <div className={Common.block}>
                    <p className={Common.title}>Modify avatar</p>
                    <div className={Style.changeAvatar}>
                        {cropper.enable ? (
                            <div className={Style.cropper}>
                                <Cropper
                                    className={loading ? 'blur' : ''}
                                    ref={$cropper}
                                    src={cropper.src}
                                    style={{ width: 460, height: 460 }}
                                    aspectRatio={1}
                                />
                                <Button className={Style.button} onClick={handleChangeAvatar}>
                                    Modify avatar
                                </Button>
                                <ReactLoading
                                    className={`${Style.loading} ${loading ? 'show' : 'hide'}`}
                                    type="spinningBubbles"
                                    color={`rgb(${primaryColor}`}
                                    height={120}
                                    width={120}
                                />
                            </div>
                        ) : (
                            <div className={Style.preview}>
                                <img
                                    className={loading ? 'blur' : ''}
                                    alt="Avatar Preview"
                                    src={avatar}
                                    onClick={selectAvatar}
                                />
                                <ReactLoading
                                    className={`${Style.loading} ${loading ? 'show' : 'hide'}`}
                                    type="spinningBubbles"
                                    color={`rgb(${primaryColor}`}
                                    height={80}
                                    width={80}
                                />
                            </div>
                        )}
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Change Password</p>
                    <div>
                        <Input
                            className={Style.input}
                            value={oldPassword}
                            onChange={setOldPassword}
                            type="password"
                            placeholder="Old Password"
                        />
                        <Input
                            className={Style.input}
                            value={newPassword}
                            onChange={setNewPassword}
                            type="password"
                            placeholder="New Password"
                        />
                        <Button className={Style.button} onClick={handleChangePassword}>
                            Confirm
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Modify username</p>
                    <div>
                        <Input
                            className={Style.input}
                            value={username}
                            onChange={setUsername}
                            type="text"
                            placeholder="Username"
                        />
                        <Button className={Style.button} onClick={handleChangeUsername}>
                            Confirm
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

export default SelfInfo;
