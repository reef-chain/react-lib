import React, {
 useEffect, useReducer, useState,
} from 'react';
import { BigNumber } from 'ethers';
import axios, { AxiosInstance } from 'axios';
import { network as libNet } from '@reef-chain/util-lib';
import './overlay.css';
import { Notify, Pool, PoolWithReserves, ReefSigner, Token, TokenPrices } from '../../state';
import { network as nw } from '@reef-chain/util-lib';
import * as store from '../../store';
import { onSwap as hooksOnswap, useSwapState } from '../../hooks';
import { OverlayAction } from '../OverlayAction';
import { Finalizing, Trade } from '../PoolActions';
import { IFormoAnalytics } from '@formo/analytics';

const REEF_ADDRESS = '0x0000000000000000000000000000000001000000';
const MAX_SLIPPAGE = 20;

interface OverlaySwap {
    isOpen: boolean;
    tokenAddress: string;
    onPoolsLoaded: (hasPools: boolean) => void;
    onClose?: () => void;
    tokens:Token[];
    signer:ReefSigner|undefined;
    nw:nw.Network;
    tokenPrices:TokenPrices;
    pools:PoolWithReserves[];
    network:libNet.DexProtocolv2 |undefined;
    notify:(message: string, type?: Notify) => void;
    isDarkMode?:boolean;
    analytics_formo?: IFormoAnalytics;
}

const poolWithReservesToPool = (p: PoolWithReserves): Pool => ({
  token1: {
    address: p.token1,
    decimals: p.decimals1,
    name: p.name1,
    symbol: p.symbol1,
    iconUrl: p.iconUrl1,
    balance: BigNumber.from(0),
  },
  token2: {
    address: p.token2,
    decimals: p.decimals2,
    name: p.name2,
    symbol: p.symbol2,
    iconUrl: p.iconUrl2,
    balance: BigNumber.from(0),
  },
  decimals: 0,
  reserve1: p.reserved1,
  reserve2: p.reserved2,
  totalSupply: '0',
  poolAddress: p.address,
  userPoolBalance: '0',
});

export const OverlaySwap = ({
  tokenAddress,
  isOpen,
  onPoolsLoaded,
  onClose,
  signer,
  tokens,
  nw,
  tokenPrices,
  pools,
  network,
  notify,
  isDarkMode=false,
  analytics_formo,
}: OverlaySwap): JSX.Element => {
  const [address1, setAddress1] = useState(tokenAddress);
  const [address2, setAddress2] = useState('0x');
  const [pool, setPool] = useState<Pool | undefined>(undefined);
  const [finalized, setFinalized] = useState(true);
  const httpClient: AxiosInstance = axios;

  // Trade
  const [tradeState, tradeDispatch] = useReducer(
    store.swapReducer,
    store.initialSwapState,
  );

  const findPool = (addr2:string):PoolWithReserves|undefined => {
    const t1 = tokenAddress < addr2 ? tokenAddress : addr2;
    const t2 = tokenAddress < addr2 ? addr2 : tokenAddress;
    return pools.find((p) => p.token1 === t1 && p.token2 === t2);
  };

  useEffect(() => {
    if (!pools || !tokenAddress || !tokens) return;

    // Add tokens not owned by user to the list of tokens and check if REEF is available for swapping
    const tokenPools = pools.filter((p) => p.token1 === tokenAddress || p.token2 === tokenAddress);
    if (!tokenPools.length) return;

    let reefAvailable = false;
    tokenPools.forEach((p) => {
      const otherToken: Token = p.token1 === tokenAddress
        ? {
          address: p.token2,
          decimals: p.decimals2,
          name: p.name2,
          symbol: p.symbol2,
          iconUrl: p.iconUrl2,
          balance: BigNumber.from(0),
        } : {
          address: p.token1,
          decimals: p.decimals1,
          name: p.name1,
          symbol: p.symbol1,
          iconUrl: p.iconUrl1,
          balance: BigNumber.from(0),
        };
      const existingToken = tokens.find((token) => token.address === otherToken.address);
      if (!existingToken) tokens.push(otherToken);
      if (!reefAvailable && otherToken.address === REEF_ADDRESS) reefAvailable = true;
    });

    let addr2 = REEF_ADDRESS;
    if (!reefAvailable) {
      addr2 = tokenPools[0].token1 === tokenAddress ? tokenPools[0].token2 : tokenPools[0].token1;
    }
    // Set default buy token
    // setAddress2(addr2); //anukulpandey - don't set default address 2 as it keeps reseting the selected address

    // Find pool
    const poolFound = findPool(addr2);
    if (poolFound) {
      onPoolsLoaded(true);
    } else {
      onPoolsLoaded(false);
      console.error('Pool not found');
    }
  }, [tokens]);

  useSwapState({
    address1,
    address2,
    dispatch: tradeDispatch,
    state: tradeState,
    tokenPrices,
    tokens,
    account: signer || undefined,
    httpClient,
    waitForPool: true,
    pool,
  });

  const onSwap = hooksOnswap({
    state: tradeState,
    network,
    account: signer || undefined,
    batchTxs: nw?.name === 'mainnet',
    dispatch: tradeDispatch,
    notify,
    updateTokenState: async () => Promise.resolve(), // eslint-disable-line
    onSuccess: () => {
      setFinalized(false);
    },
    onFinalized: () => {
      setFinalized(true);
      if (onClose) onClose();
    },
    analytics_formo,
  });
  const onSwitch = (): void => {
    tradeDispatch(store.switchTokensAction());
    tradeDispatch(store.setPercentageAction(0));
    tradeDispatch(store.clearTokenAmountsAction());
  };

  return (
    <OverlayAction
      isOpen={isOpen}
      title="Swap"
      onClose={onClose}
      className={`overlay-swap${isDarkMode?'-dark':''}`}
      isDarkMode={isDarkMode}
    >
      <div className={`uik-pool-actions pool-actions ${isDarkMode?'uik-pool-actions-dark':''}`}>
        {
          finalized
            ? (
              <Trade
                pools={pools}
                tokens={tokens}
                state={tradeState}
                isDarkMode={isDarkMode}
                maxSlippage={MAX_SLIPPAGE}
                actions={{
                  onSwap,
                  onSwitch,
                  selectToken1: (token: Token): void => setAddress1(token.address),
                  selectToken2: (token: Token): void => {
                    setAddress2(token.address);
                    const poolFound = findPool(token.address);
                    if (poolFound) {
                      setPool(poolWithReservesToPool(poolFound));
                    } else {
                      console.error('no pool found');
                    }
                  },
                  setPercentage: (amount: number) => tradeDispatch(store.setPercentageAction(amount)),
                  setToken1Amount: (amount: string): void => tradeDispatch(store.setToken1AmountAction(amount)),
                  setToken2Amount: (amount: string): void => tradeDispatch(store.setToken2AmountAction(amount)),
                  setSlippage: (slippage: number) => tradeDispatch(store.setSettingsAction({
                    ...tradeState.settings,
                    percentage: (MAX_SLIPPAGE * slippage) / 100,
                  })),
                }}
              />
            )
            : <Finalizing />
        }
      </div>
    </OverlayAction>
  );
};