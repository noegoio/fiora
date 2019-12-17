import React from 'react';

import Style from './Button.less';

interface ButtonProps {
    /** Types of: primary / danger */
    type?: string;
    /** Button text */
    children: string;
    className?: string;
    /** Click event */
    onClick: () => void;
}

function Button(props: ButtonProps) {
    const { type = 'primary', children, className = '', onClick } = props;
    return (
        <button className={`${Style.button} ${type} ${className}`} type="button" onClick={onClick}>
            {children}
        </button>
    );
}

Button.defaultProps = {
    type: 'primary',
};

export default Button;
