import React, { useState } from 'react';
import platform from 'platform';
import { useDispatch } from 'react-redux';

import Input from '../../components/Input';
import useAction from '../../hooks/useAction';

import Style from './LoginRegister.less';
import { login, getLinkmansLastMessages } from '../../service';
import getFriendId from '../../../utils/getFriendId';
import { Message } from '../../state/reducer';
import convertMessage from '../../../utils/convertMessage';
import { ActionTypes } from '../../state/action';

/** Login box */
function Login() {
    const action = useAction();
    const dispatch = useDispatch();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    async function handleLogin() {
        const user = await login(
            username,
            password,
            platform.os.family,
            platform.name,
            platform.description,
        );
        if (user) {
            action.setUser(user);
            action.toggleLoginRegisterDialog(false);
            window.localStorage.setItem('token', user.token);

            const linkmanIds = [
                ...user.groups.map((group) => group._id),
                ...user.friends.map((friend) => getFriendId(friend.from, friend.to._id)),
            ];
            const linkmanMessages = await getLinkmansLastMessages(linkmanIds);
            Object.values(linkmanMessages).forEach((messages: Message[]) =>
                messages.forEach(convertMessage),
            );
            dispatch({
                type: ActionTypes.SetLinkmansLastMessages,
                payload: linkmanMessages,
            });
        }
    }

    return (
        <div className={Style.loginRegister}>
            <h3 className={Style.title}>Username</h3>
            <Input
                className={Style.input}
                value={username}
                onChange={setUsername}
                onEnter={handleLogin}
            />
            <h3 className={Style.title}>Password</h3>
            <Input
                className={Style.input}
                type="password"
                value={password}
                onChange={setPassword}
                onEnter={handleLogin}
            />
            <button className={Style.button} onClick={handleLogin} type="button">
                Login
            </button>
        </div>
    );
}

export default Login;
