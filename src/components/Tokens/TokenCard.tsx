import { faPaperPlane, faRepeat } from '@fortawesome/free-solid-svg-icons';
import Uik from '@reef-chain/ui-kit';
import BigNumber from 'bignumber.js';
import React, { useMemo, useState } from 'react';
import { notify, toCurrencyFormat } from '../../utils/utils';
import './index.css';
import { displayBalance, displayBalanceFromToken } from '../../utils/displayBalance';
import { localizedStrings } from '../../l10n/l10n';
import { network as libNet } from '@reef-chain/util-lib';
import { PoolWithReserves, ReefSigner, Token, TokenPrices } from '../../state';
import { Provider } from '@reef-chain/evm-provider';
import { OverlaySend, OverlaySwap } from '../Overlays';

interface TokenCard {
  price: number;
  token: Token
  onClickPrice?: () => void;
  className?: string;
  tokens:Token[];
  selectedSigner:ReefSigner|undefined;
  provider:Provider|undefined;
  accounts:ReefSigner[]|undefined;
  hideBalance:any;
  tokenPrices:TokenPrices;
  pools:PoolWithReserves[];
  signer:ReefSigner | undefined;
  nw:any;
  useDexConfig:any;
  isReefswapUI:boolean;
  isDarkMode?:boolean;
  isLoading?:boolean;
}

export const TokenCard:React.FC<TokenCard> = ({
  token,
  price,
  onClickPrice,
  className,
  tokens,
  selectedSigner,
  provider,
  accounts,
  hideBalance,
  tokenPrices,
  pools,
  signer,
  nw,
  useDexConfig,
  isReefswapUI,
  isDarkMode=false,
  isLoading=false
}: TokenCard): JSX.Element => {
  const [isSwapOpen, setSwapOpen] = useState(false);
  const [isSendOpen, setSendOpen] = useState(false);
  const [hasPool, setHasPool] = useState(false);

  const network:libNet.DexProtocolv2 |undefined = useDexConfig(nw);

  const copyAddress = (): void => {
    navigator.clipboard.writeText(token.address).then(() => {
      Uik.notify.info('Copied token address to clipboard');
    }, () => {
      Uik.notify.danger('Cannot copy to clipboard');
    });
  };

  const balanceValue = new BigNumber(token.balance.toString())
    .div(new BigNumber(10).pow(token.decimals))
    .multipliedBy(price)
    .toNumber();

  const balance = useMemo(() => {
    if (Number.isNaN(balanceValue)) {
      return 'N/A';
    }

    if (balanceValue >= 1000000) {
      return `$${displayBalance(balanceValue)}`;
    }

    return toCurrencyFormat(balanceValue);
  }, [balanceValue]);

  return (
    <div className={`
      token-card
      ${className || ''}
    `}
    >
      <div className={`token-card__wrapper ${isDarkMode?'token-card__wrapper-dark':''}`}>
        <div className="token-card__main">
          <Uik.Tooltip
            text="Copy token address"
            delay={0}
          >
            <button
              className="token-card__image"
              style={{ backgroundImage: `url(${token.iconUrl})` }}
              type="button"
              aria-label="Token Image"
              onClick={copyAddress}
            />
          </Uik.Tooltip>
          <div className="token-card__info">
            <div className="token-card__token-info">
              <span className={`token-card__token-name ${isDarkMode?'token-card__token-name-dark':''}`}>{ token.name }</span>
            </div>
            <button
              className={`token-card__token-price ${isDarkMode?'token-card__token-price-dark':''}`}
              disabled={!onClickPrice}
              onClick={onClickPrice}
              type="button"
            >
              {
                isLoading? <>Loading</>:
                !!price && !Number.isNaN(+price)
                  ? (
                    <>
                      $
                      { Uik.utils.formatAmount(Uik.utils.maxDecimals(price, 4)).length? Uik.utils.formatAmount(Uik.utils.maxDecimals(price, 4)): Uik.utils.formatAmount(price.toFixed(20))}
                    </>
                  )
                  : 'N/A'
              }
            </button>
          </div>
        </div>
        <div className="token-card__aside">
          <div className="token-card__values">
            <button
              type="button"
              className={`
                token-card__value
                ${hideBalance.isHidden ? 'token-card__value--hidden' : ''}
              `}
              onClick={() => {
                if (hideBalance.isHidden) hideBalance.toggle();
              }}
            >
              {
                !hideBalance.isHidden
                  ? balance
                  : (
                    <>
                      <div />
                      <div />
                      <div />
                      <div />
                      <div />
                    </>
                  )
              }
            </button>
            <button
              type="button"
              className={`
                token-card__amount
                ${isDarkMode?'token-card__amount-dark':''}
                ${hideBalance.isHidden ? 'token-card__amount--hidden' : ''}
              `}
              onClick={() => {
                if (hideBalance.isHidden) hideBalance.toggle();
              }}
            >
              {
              !hideBalance.isHidden
                ? !isLoading?`${displayBalanceFromToken(token)} ${token.symbol}`:<>
                <div />
                    <div />
                    <div />
                    <div /></>
                : (
                  <>
                    <div />
                    <div />
                    <div />
                    <div />
                  </>
                )
            }
            </button>
          </div>

          {isReefswapUI && (
          <Uik.Button
            text={localizedStrings.swap}
            icon={faRepeat}
            onClick={() => setSwapOpen(true)}
            size="small"
            disabled={!hasPool}
          />
          )}

          <Uik.Button
            text={localizedStrings.send}
            icon={faPaperPlane}
            onClick={() => setSendOpen(true)}
            size="small"
            fill
          />
        </div>
      </div>

      <OverlaySwap
        tokenAddress={token.address}
        isOpen={isSwapOpen}
        onClose={() => setSwapOpen(false)}
        onPoolsLoaded={setHasPool}
        signer={signer}
        tokens={tokens}
        nw={nw}
        tokenPrices={tokenPrices}
        pools={pools}
        network={network}
        notify={notify}
      />

      <OverlaySend
        tokenAddress={token.address}
        isOpen={isSendOpen}
        onClose={() => setSendOpen(false)}
        tokens={tokens}
        selectedSigner={selectedSigner}
        provider={provider}
        accounts={accounts}
        notify={notify}
      />
    </div>
  );
};

