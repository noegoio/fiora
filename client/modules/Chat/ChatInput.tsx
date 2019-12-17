import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';

import Style from './ChatInput.less';
import useIsLogin from '../../hooks/useIsLogin';
import useAction from '../../hooks/useAction';
import Dropdown from '../../components/Dropdown';
import IconButton from '../../components/IconButton';
import Avatar from '../../components/Avatar';
import Message from '../../components/Message';
import { Menu, MenuItem } from '../../components/Menu';
import { State } from '../../state/reducer';
import readDiskFile, { ReadFileResult } from '../../../utils/readDiskFile';
import xss from '../../../utils/xss';
import compressImage from '../../../utils/compressImage';
import config from '../../../config/client';
import getRandomHuaji from '../../../utils/getRandomHuaji';
import uploadFile from '../../../utils/uploadFile';
import { sendMessage, getGroupOnlineMembers } from '../../service';
import voice from '../../../utils/voice';
import Tooltip from '../../components/Tooltip';
import { isMobile } from '../../../utils/ua';
import useAero from '../../hooks/useAero';

let CodeEditor: any = null;
let Expression: any = null;

function ChatInput() {
    const action = useAction();
    const isLogin = useIsLogin();
    const connect = useSelector((state: State) => state.connect);
    const selfId = useSelector((state: State) => state.user._id);
    const username = useSelector((state: State) => state.user.username);
    const avatar = useSelector((state: State) => state.user.avatar);
    const tag = useSelector((state: State) => state.user.tag);
    const focus = useSelector((state: State) => state.focus);
    const linkman = useSelector((state: State) => state.linkmans[focus]);
    const selfVoiceSwitch = useSelector((state: State) => state.status.selfVoiceSwitch);
    const [expressionDialog, toggleExpressionDialog] = useState(false);
    const [codeEditorDialog, toggleCodeEditorDialog] = useState(false);
    const [inputIME, toggleInputIME] = useState(false);
    const [inputFocus, toggleInputFocus] = useState(false);
    const [at, setAt] = useState({ enable: false, content: '' });
    const [timestamp, setTimestamp] = useState(0);
    const $input = useRef(null);
    const aero = useAero();

    /** Global input box focus shortcut */
    function focusInput(e: KeyboardEvent) {
        const $target: HTMLElement = e.target as HTMLElement;
        if ($target.tagName === 'INPUT' || $target.tagName === 'TEXTAREA' || e.key !== 'i') {
            return;
        }
        e.preventDefault();
        $input.current.focus(e);
    }
    useEffect(() => {
        window.addEventListener('keydown', focusInput);
        return () => window.removeEventListener('keydown', focusInput);
    }, []);

    useEffect(() => {
        (async () => {
            if (expressionDialog && !Expression) {
                // @ts-ignore
                const ExpressionModule = await import(
                    /* webpackChunkName: "expression" */ './Expression'
                );
                Expression = ExpressionModule.default;
                setTimestamp(Date.now());
            }
            if (codeEditorDialog && !CodeEditor) {
                // @ts-ignore
                const CodeEditorModule = await import(
                    /* webpackChunkName: "code-editor" */ './CodeEditor'
                );
                CodeEditor = CodeEditorModule.default;
                setTimestamp(Date.now());
            }
        })();
    }, [expressionDialog, codeEditorDialog]);

    if (!isLogin) {
        return (
            <div className={Style.chatInput}>
                <p className={Style.guest}>
                    Hello friends, please
                    <b
                        className={Style.guestLogin}
                        onClick={() => action.setStatus('loginRegisterDialogVisible', true)}
                        role="button"
                    >
                        login
                    </b>
                    After participating in chat
                </p>
            </div>
        );
    }

    /**
     * Insert text at the cursor of the input box
     * @param value Text to insert
     */
    function insertAtCursor(value: string) {
        const input = $input.current;
        if (input.selectionStart || input.selectionStart === 0) {
            const startPos = input.selectionStart;
            const endPos = input.selectionEnd;
            const restoreTop = input.scrollTop;
            input.value =
                input.value.substring(0, startPos) +
                value +
                input.value.substring(endPos, input.value.length);
            if (restoreTop > 0) {
                input.scrollTop = restoreTop;
            }
            input.focus();
            input.selectionStart = startPos + value.length;
            input.selectionEnd = startPos + value.length;
        } else {
            input.value += value;
            input.focus();
        }
    }

    function handleSelectExpression(expression: string) {
        toggleExpressionDialog(false);
        insertAtCursor(`#(${expression})`);
    }

    function addSelfMessage(type, content) {
        const _id = focus + Date.now();
        const message = {
            _id,
            type,
            content,
            createTime: Date.now(),
            from: {
                _id: selfId,
                username,
                avatar,
                tag,
            },
            loading: true,
            percent: type === 'image' ? 0 : 100,
        };
        // @ts-ignore
        action.addLinkmanMessage(focus, message);

        if (selfVoiceSwitch && type === 'text') {
            const text = content
                .replace(
                    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g,
                    '',
                )
                .replace(/#/g, '');

            if (text.length > 0 && text.length <= 100) {
                voice.push(text, Math.random());
            }
        }

        return _id;
    }

    // eslint-disable-next-line react/destructuring-assignment
    async function handleSendMessage(localId, type, content, linkmanId = focus) {
        const [error, message] = await sendMessage(linkmanId, type, content);
        if (error) {
            action.deleteMessage(focus, localId);
        } else {
            message.loading = false;
            action.updateMessage(focus, localId, message);
        }
    }

    function sendImageMessage(image: string): void;
    function sendImageMessage(image: ReadFileResult): void;
    function sendImageMessage(image: string | ReadFileResult) {
        if (typeof image === 'string') {
            const id = addSelfMessage('image', image);
            handleSendMessage(id, 'image', image);
            toggleExpressionDialog(false);
            return;
        }

        if (image.length > config.maxImageSize) {
            Message.warning('The picture to be sent is too large', 3);
            return;
        }

        const ext = image.type
            .split('/')
            .pop()
            .toLowerCase();
        const url = URL.createObjectURL(image.result);

        const img = new Image();
        img.onload = async () => {
            const id = addSelfMessage('image', `${url}?width=${img.width}&height=${img.height}`);
            try {
                const imageUrl = await uploadFile(
                    image.result as Blob,
                    `ImageMessage/${selfId}_${Date.now()}.${ext}`,
                    `ImageMessage_${selfId}_${Date.now()}.${ext}`,
                    (info: any) => {
                        action.updateMessage(focus, id, { percent: info.total.percent });
                    },
                );
                handleSendMessage(
                    id,
                    'image',
                    `${imageUrl}?width=${img.width}&height=${img.height}`,
                    focus,
                );
            } catch (err) {
                console.error(err);
                Message.error('Image upload failed');
            }
        };
        img.src = url;
    }

    async function handleSelectFile() {
        if (!connect) {
            return Message.error('Sending message failed, you are currently offline');
        }
        const image = await readDiskFile('blob', 'image/png,image/jpeg,image/gif');
        if (!image) {
            return null;
        }
        sendImageMessage(image);
        return null;
    }
    async function sendHuaji() {
        const huaji = getRandomHuaji();
        const id = addSelfMessage('image', huaji);
        handleSendMessage(id, 'image', huaji);
    }

    function handleFeatureMenuClick({ key, domEvent }) {
        // Quickly hitting the Enter key causes the button to repeatedly trigger the problem
        if (domEvent.keyCode === 13) {
            return;
        }

        switch (key) {
            case 'image': {
                handleSelectFile();
                break;
            }
            case 'huaji': {
                sendHuaji();
                break;
            }
            case 'code': {
                toggleCodeEditorDialog(true);
                break;
            }
            default:
        }
    }

    async function handlePaste(e) {
        // eslint-disable-next-line react/destructuring-assignment
        if (!connect) {
            e.preventDefault();
            return Message.error('Sending message failed, you are currently offline');
        }
        const { items, types } = e.clipboardData || e.originalEvent.clipboardData;

        // If the file content is included
        if (types.indexOf('Files') > -1) {
            for (let index = 0; index < items.length; index++) {
                const item = items[index];
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file) {
                        const reader = new FileReader();
                        reader.onloadend = function handleLoad() {
                            const image = new Image();
                            image.onload = async () => {
                                const imageBlob = await compressImage(image, file.type, 0.8);
                                sendImageMessage({
                                    filename: file.name,
                                    ext: imageBlob.type.split('/').pop(),
                                    length: imageBlob.size,
                                    type: imageBlob.type,
                                    result: imageBlob,
                                });
                            };
                            image.src = this.result as string;
                        };
                        reader.readAsDataURL(file);
                    }
                }
            }
            e.preventDefault();
        }
        return null;
    }

    function sendTextMessage() {
        if (!connect) {
            return Message.error('Sending message failed, you are currently offline');
        }

        const message = $input.current.value.trim();
        if (message.length === 0) {
            return null;
        }

        if (/^invite::/.test(message)) {
            const groupName = message.replace('invite::', '');
            const id = addSelfMessage(
                'invite',
                JSON.stringify({
                    inviter: username,
                    groupId: '',
                    groupName,
                }),
            );
            handleSendMessage(id, 'invite', groupName);
        } else {
            const id = addSelfMessage('text', xss(message));
            handleSendMessage(id, 'text', message);
        }
        $input.current.value = '';
        return null;
    }

    async function handleInputKeyDown(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
        } else if (e.key === 'Enter' && !inputIME) {
            sendTextMessage();
        } else if (e.altKey && (e.key === 's' || e.key === 'ß')) {
            sendHuaji();
            e.preventDefault();
        } else if (e.altKey && (e.key === 'd' || e.key === '∂')) {
            toggleExpressionDialog(true);
            e.preventDefault();
        } else if (e.key === '@') {
            // If you press @ 建, enter @calculation mode
            if (!/@/.test($input.current.value)) {
                setAt({
                    enable: true,
                    content: '',
                });
                const onlineMembers = await getGroupOnlineMembers(focus);
                action.setLinkmanProperty(focus, 'onlineMembers', onlineMembers);
            }
            // eslint-disable-next-line react/destructuring-assignment
        } else if (at.enable) {
            // If in @calculation mode
            const { key } = e;
            // Delay to get new value and ime state
            setTimeout(() => {
                // If @ has been deleted, exit @calculation mode
                if (!/@/.test($input.current.value)) {
                    setAt({ enable: false, content: '' });
                    return;
                }
                // If you enter Chinese, and not the space bar, ignore the input
                if (inputIME && key !== ' ') {
                    return;
                }
                // If it is not Chinese, and it is the space bar, the @calculation mode ends
                if (!inputIME && key === ' ') {
                    setAt({ enable: false, content: '' });
                    return;
                }

                // If you are typing Chinese, return directly to avoid getting Pinyin letters
                if (inputIME) {
                    return;
                }
                const regexResult = /@([^ ]*)/.exec($input.current.value);
                if (regexResult) {
                    setAt({ enable: true, content: regexResult[1] });
                }
            }, 100);
        }
    }

    function getSuggestion() {
        if (!at.enable || linkman.type !== 'group') {
            return [];
        }
        return linkman.onlineMembers.filter((member) => {
            const regex = new RegExp(`^${at.content}`);
            if (regex.test(member.user.username)) {
                return true;
            }
            return false;
        });
    }

    function replaceAt(targetUsername) {
        $input.current.value = $input.current.value.replace(
            `@${at.content}`,
            `@${targetUsername} `,
        );
        setAt({
            enable: false,
            content: '',
        });
        $input.current.focus();
    }

    function handleSendCode(language: string, rawCode: string) {
        if (!connect) {
            return Message.error('Sending message failed, you are currently offline');
        }

        if (rawCode === '') {
            return Message.warning('Please enter content');
        }

        const code = `@language=${language}@${rawCode}`;
        const id = addSelfMessage('code', code);
        handleSendMessage(id, 'code', code);
        toggleCodeEditorDialog(false);
        return null;
    }

    return (
        <>
            <div className={Style.chatInput} {...aero}>
                <Dropdown
                    trigger={['click']}
                    visible={expressionDialog}
                    onVisibleChange={toggleExpressionDialog}
                    overlay={
                        <div className={Style.expressionDropdown}>
                            {Expression && (
                                <Expression
                                    onSelectText={handleSelectExpression}
                                    onSelectImage={sendImageMessage}
                                />
                            )}
                        </div>
                    }
                    animation="slide-up"
                    placement="topLeft"
                >
                    <IconButton
                        className={Style.iconButton}
                        width={44}
                        height={44}
                        icon="expression"
                        iconSize={32}
                    />
                </Dropdown>
                <Dropdown
                    trigger={['click']}
                    overlay={
                        <div className={Style.featureDropdown}>
                            <Menu onClick={handleFeatureMenuClick}>
                                <MenuItem key="huaji">发送滑稽</MenuItem>
                                <MenuItem key="image">发送图片</MenuItem>
                                <MenuItem key="code">发送代码</MenuItem>
                            </Menu>
                        </div>
                    }
                    animation="slide-up"
                    placement="topLeft"
                >
                    <IconButton
                        className={Style.iconButton}
                        width={44}
                        height={44}
                        icon="feature"
                        iconSize={32}
                    />
                </Dropdown>
                <form
                    className={Style.form}
                    autoComplete="off"
                    onSubmit={(e) => e.preventDefault()}
                >
                    <input
                        className={Style.input}
                        type="text"
                        placeholder="随便聊点啥吧, 不要无意义刷屏~~"
                        maxLength={2048}
                        ref={$input}
                        onKeyDown={handleInputKeyDown}
                        onPaste={handlePaste}
                        onCompositionStart={() => toggleInputIME(true)}
                        onCompositionEnd={() => toggleInputIME(false)}
                        onFocus={() => toggleInputFocus(true)}
                        onBlur={() => toggleInputFocus(false)}
                    />

                    {!isMobile && !inputFocus && (
                        <Tooltip
                            placement="top"
                            mouseEnterDelay={0.5}
                            overlay={
                                <span>
                                    Support pasting pictures
                                    <br />
                                    Press i key globally to focus
                                </span>
                            }
                        >
                            <i className={`iconfont icon-about ${Style.tooltip}`} />
                        </Tooltip>
                    )}
                </form>
                <IconButton
                    className={Style.iconButton}
                    width={44}
                    height={44}
                    icon="send"
                    iconSize={32}
                    onClick={sendTextMessage}
                />

                <div className={Style.atPanel}>
                    {at.enable &&
                        getSuggestion().map((member) => (
                            <div
                                className={Style.atUserList}
                                key={member.user._id}
                                onClick={() => replaceAt(member.user.username)}
                                role="button"
                            >
                                <Avatar size={24} src={member.user.avatar} />
                                <p className={Style.atText}>{member.user.username}</p>
                            </div>
                        ))}
                </div>

                {CodeEditor && (
                    <CodeEditor
                        visible={codeEditorDialog}
                        onClose={() => toggleCodeEditorDialog(false)}
                        onSend={handleSendCode}
                    />
                )}
            </div>
            <span className="hide">{timestamp}</span>
        </>
    );
}

export default ChatInput;
