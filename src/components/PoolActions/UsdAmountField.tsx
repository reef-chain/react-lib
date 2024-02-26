import BigNumber from 'bignumber.js';
import React, { useState } from 'react';
import { Token } from '../../state';
import './token-field.css';
import Uik from '@reef-chain/ui-kit';

export type SelectToken = (token: Token) => void

const {Text} = Uik;
BigNumber.config({ EXPONENTIAL_AT: 1000 });

interface UsdAmountField {
  value:string;
  onInput: (amount: string) => void;
}

const UsdAmountField = ({
  value,
  onInput,
}: UsdAmountField): JSX.Element => {
  const [isFocused, setFocused] = useState(false);
  const onInputFocus = (): void => setFocused(true);
  const onInputBlur = (): void => setFocused(false);

  return (
    <div
      className={`
        uik-pool-actions-token
        ${isFocused ? 'uik-pool-actions-token--focused' : ''}
      `}
      style={{
        marginTop:'1rem',
      }}
    >
        <div style={{
            paddingLeft:'2rem',
            width: '12rem'
        }}>
        <Text text='USD: ' type='light'/>
        <a style={{
            color: '#b2b0c8',
            fontSize: '0.775rem',
            textDecoration: 'none',
        }}
        href='https://www.coingecko.com/en/coins/reef'
        target='_blank'
        >
            Approximate Value
        </a>
        </div>
        <div className="uik-pool-actions-token__value">
          <input
            type="number"
            min={0.0}
            value={value}
            onBlur={onInputBlur}
            onFocus={onInputFocus}
            size={1}
            placeholder="0.0"
            onChange={(event) => onInput(event.target.value)}
          />
        </div>
        <div style={{
            paddingRight:'2rem'
        }}>
        <Text text="$" type='light'/>
        </div>
    </div>
  );
};

export default UsdAmountField;
