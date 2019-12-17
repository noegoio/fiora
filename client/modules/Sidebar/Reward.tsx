import React from 'react';

import Dialog from '../../components/Dialog';
import Style from './Reward.less';

interface RewardProps {
    visible: boolean;
    onClose: () => void;
}

function Reward(props: RewardProps) {
    const { visible, onClose } = props;
    return (
        <Dialog className={Style.reward} visible={visible} title="打赏" onClose={onClose}>
            <div>
                <p className={Style.text}>
                    If you think this chat room code is helpful to you, I hope to give you a
                    encouragement ~~
                    <br />
                    The author is online most of the time, welcome to ask questions, have questions
                </p>
                <div className={Style.imageContainer}>
                    <img
                        className={Style.image}
                        src={require('../../assets/images/alipay.png')}
                        alt="Alipay QR code"
                    />
                    <img
                        className={Style.image}
                        src={require('../../assets/images/wxpay.png')}
                        alt="Wechat QR code"
                    />
                </div>
            </div>
        </Dialog>
    );
}

export default Reward;
