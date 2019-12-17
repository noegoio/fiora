import React from 'react';

import Dialog from '../../components/Dialog';

import Style from './Download.less';
import Common from './Common.less';

interface DownloadProps {
    visible: boolean;
    onClose: () => void;
}

function Download(props: DownloadProps) {
    const { visible, onClose } = props;
    return (
        <Dialog className={Style.download} visible={visible} title="Download APP" onClose={onClose}>
            <div className={Common.container}>
                <div className={Common.block}>
                    <p className={Common.title}>Android</p>
                    <div className={Style.android}>
                        <p>Click the link or scan the code to download APK</p>
                        <a href={`https://cdn.suisuijiang.com/fiora.apk?v=${Date.now()}`} download>
                            https://cdn.suisuijiang.com/fiora.apk
                        </a>
                        <br />
                        <img
                            src={require('../../assets/images/android-apk.png')}
                            alt="Android app download QR code"
                        />
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>iOS</p>
                    <div className={Style.ios}>
                        <p>1. Apple Store search expo and download Expo Client</p>
                        <p>
                            2. Open expo, and log in with the sho's expo account(suisuijiang /
                            fiora123456)
                        </p>
                        <p>3. After successful login, click fiora to launch the application</p>
                        <img
                            src={require('../../assets/images/ios-expo.png')}
                            alt="ios expo operation guidelines"
                        />
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

export default Download;
