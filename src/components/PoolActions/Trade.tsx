import { faRepeat, faWarning } from '@fortawesome/free-solid-svg-icons';
import Uik from '@reef-chain/ui-kit';
import BigNumber from 'bignumber.js';
import React, { useMemo, useState } from 'react';
import ReactTooltip from 'react-tooltip';
import { SwapState } from '../../store';
import TokenField, { SelectToken } from './TokenField';

import {
  LastPoolReserves, Pool, resolveSettings, Token,
} from '../../state';
import TradePopup from './ConfirmPopups/Trade';

interface TradeActions {
  onSwitch: () => void;
  onSwap: () => Promise<void>;
  setToken1Amount: (amount: string) => void;
  setToken2Amount: (amount: string) => void;
  setPercentage: (amount: number) => void;
  selectToken1?: SelectToken;
  selectToken2?: SelectToken;
  setSlippage?: (slippage: number) => void;
}

interface Trade {
  pools: LastPoolReserves[];
  tokens: Token[];
  state: SwapState;
  actions: TradeActions;
  maxSlippage?: number;
  confirmText?: string;
  isDarkMode?:boolean;
}

interface SummaryItem {
  label: string,
  value?: string,
  empty?: boolean,
  className?: string
  warn?: string;
  isDarkMode?:boolean;
}

const SummaryItem = ({
  label,
  value,
  empty,
  className,
  warn = '',
  isDarkMode=false,
}: SummaryItem): JSX.Element => (
  <div
    className={`
      uik-pool-actions__summary-item
      ${empty ? 'uik-pool-actions__summary-item--empty' : ''}
      ${className || ''}
    `}
  >
    <div className={`uik-pool-actions__summary-item-label ${isDarkMode?'summary-light-text':''}`}>
      { label }
      { warn !== '' && (
      <span className="slippage-warning">
        <span data-tip data-for="slippage-warning">
          <Uik.Icon icon={faWarning} className="icon" />
        </span>
        <ReactTooltip
          id="slippage-warning"
          place="top"
          effect="solid"
        >
          { warn }
        </ReactTooltip>
      </span>
      )}
    </div>
    <div className={`uik-pool-actions__summary-item-value ${isDarkMode?'summary-light-text':''}`}>{ value }</div>
  </div>
);

const calculateRate = (
  sellTokenAddress: string,
  {
    token1: {
      address,
      symbol: symbol1,
      decimals: decimals1,
    },
    token2: {
      symbol: symbol2,
      decimals: decimals2,
    },
    reserve1,
    reserve2,
  }: Pool,
): string => {
  if (reserve1 === '0' || reserve2 === '0') {
    return 'No liquidity';
  }
  const r1 = new BigNumber(reserve1).div(new BigNumber(10).pow(decimals1));
  const r2 = new BigNumber(reserve2).div(new BigNumber(10).pow(decimals2));
  const res = sellTokenAddress !== address ? r1.div(r2) : r2.div(r1);
  return `1 ${symbol1} = ${Uik.utils.maxDecimals(res.toNumber(), 4)} ${symbol2}`;
};

// eslint-disable-next-line react-hooks/rules-of-hooks
const selectTokensForToken = (token: Token, tokens: Token[], pools: LastPoolReserves[]): Token[] => useMemo(
  () => {
    const availableTokens = pools
      .filter(({ token1, token2 }) => token1 === token.address || token2 === token.address)
      .reduce((acc: Set<string>, pool) => {
        if (pool.token1 === token.address) {
          acc.add(pool.token2);
        } else {
          acc.add(pool.token1);
        }
        return acc;
      }, new Set<string>());
    return tokens.filter((t) => availableTokens.has(t.address));
  },
  [token, tokens, pools],
);

export const Trade = ({
  state: {
    token1,
    percentage,
    token2,
    focus,
    isLoading,
    isValid,
    pool,
    settings,
    status,
  }, actions: {
    onSwap,
    onSwitch,
    setPercentage,
    setToken1Amount,
    setToken2Amount,
    selectToken1,
    selectToken2,
    setSlippage,
  },
  pools,
  tokens,
  maxSlippage = 100,
  isDarkMode=false
} : Trade): JSX.Element => {
  const { percentage: slippage } = resolveSettings(settings);
  const rate = pool ? calculateRate(token1.address, pool) : undefined;
  const [isPopupOpen, setPopupOpen] = useState(false);

  const selectTokens1 = selectTokensForToken(token2, tokens, pools);
  const selectTokens2 = selectTokensForToken(token1, tokens, pools);
  let summaryItemWarning = '';

  if (slippage > 3) {
    summaryItemWarning = 'Your transaction may be frontrun and result in an unfavorable trade.';
  } else if (slippage < 0.1) {
    summaryItemWarning = 'Slippage below 0.1% may result in a failed transaction.';
  }

  const fee = useMemo(() => {
    if (token1.amount === '') {
      return '0 $';
    }
    return `${new BigNumber(token1.amount)
      .multipliedBy(token1.price)
      .multipliedBy(0.0003)
      .toFixed(4)} $`;
  }, [token1.amount, token1.address, token1.price]);

  return (
    <div>
      <div className="uik-pool-actions__tokens">
        <TokenField
          token={token1}
          tokens={selectTokens1}
          onAmountChange={setToken1Amount}
          selectToken={selectToken1}
          isDarkMode={isDarkMode}
        />

        <div className="uik-pool-actions__switch-slider-container">
          <div className="uik-pool-actions__token-switch">
            <button
              type="button"
              aria-label="Switch button"
              className={`
                uik-pool-actions__token-switch-btn
                ${focus === 'buy' ? 'uik-pool-actions__token-switch-btn--reversed' : ''}
              `}
              onClick={onSwitch}
            >
              <Uik.Icon icon={faRepeat} />
            </button>
          </div>

          <div className="uik-pool-actions__slider">
            <Uik.Slider
              value={percentage}
              onChange={setPercentage}
              tooltip={`${Uik.utils.maxDecimals(percentage, 2)}%`}
              steps={0.25}
              helpers={[
                { position: 0, text: '0%' },
                { position: 25 },
                { position: 50, text: '50%' },
                { position: 75 },
                { position: 100, text: '100%' },
              ]}
            />
          </div>
        </div>

        <TokenField
          token={token2}
          tokens={selectTokens2}
          onAmountChange={setToken2Amount}
          selectToken={selectToken2}
          isDarkMode={isDarkMode}
        />
      </div>

      <div className={`uik-pool-actions__summary uik-pool-actions__trade-summary ${isDarkMode?'pool-actions__summary-dark':''}`}>
        <SummaryItem
          label="Rate"
          value={rate}
          empty={!rate}
          isDarkMode={isDarkMode}
        />
        <SummaryItem
          label="Fee"
          value={fee}
          empty={!fee}
          isDarkMode={isDarkMode}
        />
        <SummaryItem
          label="Slippage"
          className={slippage > 3 || slippage < 0.1 ? 'uik-pool-actions__trade-slippage--warn' : ''}
          value={`${slippage}%`}
          empty={!slippage}
          warn={summaryItemWarning}
          isDarkMode={isDarkMode}
        />
      </div>

      <div className="uik-pool-actions__slider">
        <Uik.Slider
          value={(slippage * 100) / maxSlippage}
          onChange={setSlippage}
          tooltip={`${Uik.utils.maxDecimals(slippage, 2)}%`}
          helpers={[
            { position: 0, text: '0%' },
            { position: 25 },
            { position: 50, text: `${maxSlippage / 2}%` },
            { position: 75 },
            { position: 100, text: `${maxSlippage}%` },
          ]}
        />
      </div>

      <Uik.Button
        className={`uik-pool-actions__cta ${isDarkMode?'dark-btn':''}`}
        fill
        icon={faRepeat}
        text={status}
        size="large"
        loading={isLoading}
        disabled={!isValid || isLoading}
        onClick={() => setPopupOpen(true)}
      />

      <TradePopup
        fee={fee}
        isOpen={isPopupOpen}
        onClose={() => setPopupOpen(false)}
        onConfirm={onSwap}
        token1={token1}
        token2={token2}
        slippage={slippage}
        exchangeRate={rate}
      />
    </div>
  );
};
