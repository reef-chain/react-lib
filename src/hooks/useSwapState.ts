/* eslint-disable prefer-promise-reject-errors */
import Uik from '@reef-chain/ui-kit';
import { BigNumber, Contract } from 'ethers';
import { Dispatch, useEffect, useRef } from 'react';
import { AxiosInstance } from 'axios';
import {network} from "@reef-chain/util-lib";
import { toBN } from '@reef-chain/evm-provider/utils';
import { ERC20 } from '../assets/abi/ERC20';
import { getReefswapRouter } from '../rpc';
import {
  AddressToNumber,
  ensureTokenAmount,
  NotifyFun,
  Pool,
  ReefSigner,
  resolveSettings, Token,
  TokenWithAmount,
} from '../state';
import { SwapAction } from '../store';
import {
  clearTokenAmountsAction, setCompleteStatusAction, setLoadingAction, setPoolAction, setStatusAction, setToken1Action, setToken2Action, setTokenPricesAction,
} from '../store/actions/defaultActions';
import { SwapState } from '../store/reducers/swap';
import {
  ButtonStatus,
  calculateAmount,
  calculateAmountWithPercentage,
  calculateDeadline,
  captureError,
  convert2Normal,
  ensure,
  errorHandler,
} from '../utils';
import { findToken } from './useKeepTokenUpdated';
import { useLoadPool } from './useLoadPool';
import { IFormoAnalytics, TransactionStatus } from '@formo/analytics';

type Network = network.DexProtocolv2;

const CHAIN_ID = 13939;

// Helper to build common analytics_formo payload
const buildBasePayload = (
  token1: TokenWithAmount,
  token2: TokenWithAmount,
  account: ReefSigner,
  settings: { percentage: number; deadline: number },
  batchTxs?: boolean,
) => ({
  sellToken: {
    address: token1.address,
    symbol: token1.symbol,
    amount: token1.amount,
    price: token1.price,
  },
  buyToken: {
    address: token2.address,
    symbol: token2.symbol,
    amount: token2.amount,
    price: token2.price,
  },
  userAddress: account.evmAddress,
  slippagePercentage: settings.percentage,
  deadline: settings.deadline,
  chainId: CHAIN_ID,
  flowType: batchTxs ? 'batch' : 'sequential',
  timestamp: Date.now(),
});

const swapStatus = (
  sell: TokenWithAmount,
  buy: TokenWithAmount,
  isEvmClaimed?: boolean,
  pool?: Pool,
): ButtonStatus => {
  try {
    ensure(isEvmClaimed === true, 'Bind account');
    ensure(!sell.isEmpty, 'Select sell token');
    ensure(!buy.isEmpty, 'Select buy token');
    ensure(buy.address !== sell.address, 'Tokens must be different');
    ensure(!!pool, 'Pool does not exist');
    ensure(sell.amount.length !== 0, `Missing ${sell.symbol} amount`);
    ensure(buy.amount.length !== 0, `Missing ${buy.symbol} amount`);
    ensure(parseFloat(sell.amount) > 0, `Missing ${sell.symbol} amount`);
    ensure(
      parseFloat(sell.amount)
        <= convert2Normal(sell.decimals, sell.balance.toString()),
      `Insufficient ${sell.symbol} balance`,
    );

    // Because of aboves ensure pool would not need explanation mark. Typescript broken...
    const { reserve1, reserve2 } = pool!;
    const amountOut1 = BigNumber.from(calculateAmount(sell));
    const amountOut2 = BigNumber.from(calculateAmount(buy));
    const reserved1 = BigNumber.from(reserve1).sub(amountOut1);
    const reserved2 = BigNumber.from(reserve2).sub(amountOut2);

    ensure(reserved1.gt(0) || reserved2.gt(0), 'Insufficient amounts');

    return { isValid: true, text: 'Trade' };
  } catch (e) {
    return { isValid: false, text: e.message };
  }
};

interface UseSwapState {
  address1: string;
  address2: string;
  state: SwapState;
  tokens: Token[];
  account?: ReefSigner;
  httpClient?:AxiosInstance;
  tokenPrices: AddressToNumber<number>;
  dispatch: Dispatch<SwapAction>;
  waitForPool?: boolean;
  pool?: Pool;
}

export const useSwapState = ({
  state,
  tokens,
  account,
  httpClient,
  address1,
  address2,
  tokenPrices,
  dispatch,
  waitForPool,
  pool: poolProp,
}: UseSwapState): void => {
  const {
    token2: buy, token1: sell, pool, isLoading, isValid,
  } = state;
  const setBuy = (token: TokenWithAmount): void => dispatch(setToken2Action(token));
  const setSell = (token: TokenWithAmount): void => dispatch(setToken1Action(token));
  const tokenBuySet = useRef<boolean>(false);
  const tokenSellSet = useRef<boolean>(false);
  const prevAddress1 = useRef<string>('');
  const prevAddress2 = useRef<string>('');
  const prevBuyBalance = useRef<string>('');
  const prevSellBalance = useRef<string>('');

  // Updating swap pool
  let loadedPool: Pool | undefined;
  let isPoolLoading = false;
  if (waitForPool) {
    
    // Avoid querying pool based on token addresses and receive pool from props
    loadedPool = poolProp;
  } else {
     // eslint-disable-next-line react-hooks/rules-of-hooks
    [loadedPool, isPoolLoading] = useLoadPool(
      sell,
      buy,
      account?.evmAddress || '',
      httpClient,
      isLoading,
    );
  }
  
  useEffect(() => {
    if (loadedPool) {
      dispatch(setPoolAction(loadedPool));
    }
  }, [loadedPool]);

  useEffect(() => {
    const foundToken1 = findToken(address2, tokens);
    if (prevAddress2.current !== address2 || (!tokenBuySet.current && buy.address)
        || prevBuyBalance.current !== foundToken1.balance.toString()) {
      const price = tokenPrices[address2];
      setBuy({ ...foundToken1, amount: buy.amount, price });
      tokenBuySet.current = true;
      prevAddress2.current = address2;
      prevBuyBalance.current = foundToken1.balance.toString();
    }
    const foundToken2 = findToken(address1, tokens);
    if (prevAddress1.current !== address1 || (!tokenSellSet.current && sell.address)
        || prevSellBalance.current !== foundToken2.balance.toString()) {
      const price = tokenPrices[address1];
      setSell({ ...foundToken2, amount: sell.amount, price });
      tokenSellSet.current = true;
      prevAddress1.current = address1;
      prevSellBalance.current = foundToken2.balance.toString();
    }
  }, [tokens, tokenPrices, address1, address2]);

  useEffect(() => {
    if ((tokenPrices[address1] || tokenPrices[address2]) && (tokenBuySet.current || tokenSellSet.current)) {
      dispatch(setTokenPricesAction(tokenPrices));
    }
  }, [tokenPrices]);

  useEffect(() => {
    let [currentStatus, currentIsValid, currentIsLoading] = [
      '',
      isValid,
      isLoading,
    ];
    if (isPoolLoading) {
      currentStatus = 'Loading pool';
      currentIsLoading = true;
    } else {
      const { isValid, text } = swapStatus(
        sell,
        buy,
        account?.isEvmClaimed,
        pool,
      );
      currentStatus = text;
      currentIsValid = isValid;
      currentIsLoading = false;
    }
    dispatch(
      setCompleteStatusAction(currentStatus, currentIsValid, currentIsLoading),
    );
  }, [sell.amount, buy.amount, account?.isEvmClaimed, pool, isPoolLoading]);
};

interface OnSwap {
  state: SwapState;
  network?: Network;
  account?: ReefSigner;
  batchTxs?: boolean;
  notify: NotifyFun;
  dispatch: Dispatch<SwapAction>;
  updateTokenState: () => Promise<void>;
  onSuccess?: (...args: any[]) => any;
  onFinalized?: (...args: any[]) => any;
  analytics_formo?: IFormoAnalytics;
}

export const onSwap = ({
  state,
  network,
  account,
  batchTxs,
  dispatch,
  updateTokenState,
  onSuccess,
  onFinalized,
  analytics_formo,
}: OnSwap) => async (): Promise<void> => {
  const {
    token1, settings, token2, isValid, isLoading,
  } = state;
  
  if (!isValid || isLoading || !account || !network) {
    return;
  }
  
  const { signer, address, evmAddress } = account;
  const { percentage, deadline } = resolveSettings(settings);
  const basePayload = buildBasePayload(token1, token2, account, { percentage, deadline }, batchTxs);

  // Track swap initiated
  analytics_formo?.track('swap_initiated', basePayload);

  try {
    dispatch(setLoadingAction(true));
    ensureTokenAmount(token1);

    const sellAmount = calculateAmount(token1);
    const minBuyAmount = calculateAmountWithPercentage(token2, percentage);
    const reefswapRouter = getReefswapRouter(network.routerAddress, signer);
    const sellTokenContract = new Contract(token1.address, ERC20, signer);

    dispatch(setStatusAction('Executing trade'));

    // Prepare approval transaction
    const approveTransaction = await sellTokenContract.populateTransaction.approve(
      network.routerAddress,
      sellAmount,
    );

    // Prepare trade transaction
    const tradeTransaction = await reefswapRouter.populateTransaction.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      sellAmount,
      minBuyAmount,
      [token1.address, token2.address],
      evmAddress,
      calculateDeadline(deadline),
    );

    const approveResources = await signer.provider.estimateResources(approveTransaction);

    const approveExtrinsic = signer.provider.api.tx.evm.call(
      approveTransaction.to,
      approveTransaction.data,
      toBN(approveTransaction.value || 0),
      toBN(approveResources.gas),
      approveResources.storage.lt(0) ? toBN(0) : toBN(approveResources.storage),
    );

    if (batchTxs) {
      // === BATCHED TRANSACTION FLOW ===
      
      // Track batch approval started
      analytics_formo?.track('batch_approval_started', {
        ...basePayload,
        routerAddress: network.routerAddress,
        approvalAmount: sellAmount.toString(),
      });

      const tradeExtrinsic = signer.provider.api.tx.evm.call(
        tradeTransaction.to,
        tradeTransaction.data,
        toBN(tradeTransaction.value || 0),
        toBN(582938 * 2),// hardcoded gas estimation, multiply by 2 as a safety margin
        toBN(64 * 2),// hardcoded storage estimation, multiply by 2 as a safety margin
      );

      // Track batch trade started
      analytics_formo?.track('batch_trade_started', {
        ...basePayload,
        sellAmount: sellAmount.toString(),
        minBuyAmount: minBuyAmount.toString(),
        path: [token1.address, token2.address],
      });

      const batch = signer.provider.api.tx.utility.batchAll([
        approveExtrinsic,
        tradeExtrinsic,
      ]);

      // Signing and awaiting when data comes in block
      analytics_formo?.track('batch_signed_and_sent', basePayload);
      analytics_formo?.transaction({
        status: TransactionStatus.BROADCASTED,
        address: evmAddress!,
        chainId: CHAIN_ID,
      });

      const signAndSend = new Promise<void>((resolve, reject): void => {
        batch.signAndSend(
          address,
          { signer: signer.signingKey },
          (status: any) => {
            const err = captureError(status.events);
            if (err) {
              // Track batch error
              analytics_formo?.track('batch_error', {
                ...basePayload,
                stage: 'sign_and_send',
                errorMessage: err,
              });
              reject({ message: err });
            }
            if (status.dispatchError) {
              // Track batch error
              analytics_formo?.track('batch_error', {
                ...basePayload,
                stage: 'dispatch',
                errorMessage: status.dispatchError.toString(),
              });
              reject({ message: status.dispatchError.toString() });
            }
            if (status.status.isInBlock) {
              // Track batch in block
              analytics_formo?.track('batch_in_block', basePayload);
              analytics_formo?.transaction({
                status: TransactionStatus.BROADCASTED,
                address: evmAddress!,
                chainId: CHAIN_ID,
              });
              resolve();
            }
            // If you want to await until block is finalized use below if
            if (status.status.isFinalized) {
              // Track batch finalized
              analytics_formo?.track('batch_finalized', basePayload);
              analytics_formo?.transaction({
                status: TransactionStatus.CONFIRMED,
                address: evmAddress!,
                chainId: CHAIN_ID,
              });
              
              if (onFinalized) onFinalized();
              Uik.notify.success({
                message: 'Blocks have been finalized',
                aliveFor: 10,
              });
            }
          },
        );
      });
      await signAndSend;
      
    } else {
      // === SEQUENTIAL TRANSACTION FLOW ===
      
      // Track approval started
      analytics_formo?.track('approval_started', {
        ...basePayload,
        routerAddress: network.routerAddress,
        approvalAmount: sellAmount.toString(),
      });

      // Track approval signed and sent
      analytics_formo?.track('approval_signed_and_sent', basePayload);
      analytics_formo?.transaction({
        status: TransactionStatus.BROADCASTED,
        address: evmAddress!,
        chainId: CHAIN_ID,
      });

      const signAndSendApprove = new Promise<void>((resolve, reject) => {
        approveExtrinsic.signAndSend(
          address,
          { signer: signer.signingKey },
          (status: any) => {
            const err = captureError(status.events);
            if (err) {
              // Track approval error
              analytics_formo?.track('approval_error', {
                ...basePayload,
                stage: 'sign_and_send',
                errorMessage: err,
              });
              reject({ message: err });
            }
            if (status.dispatchError) {
              // Track approval error
              analytics_formo?.track('approval_error', {
                ...basePayload,
                stage: 'dispatch',
                errorMessage: status.dispatchError.toString(),
              });
              console.error(status.dispatchError.toString());
              reject({ message: status.dispatchError.toString() });
            }
            if (status.status.isInBlock) {
              // Track approval in block
              analytics_formo?.track('approval_in_block', basePayload);
              analytics_formo?.transaction({
                status: TransactionStatus.CONFIRMED,
                address: evmAddress!,
                chainId: CHAIN_ID,
              });
              resolve();
            }
          },
        );
      });
      await signAndSendApprove;

      // Track trade started
      analytics_formo?.track('trade_started', {
        ...basePayload,
        sellAmount: sellAmount.toString(),
        minBuyAmount: minBuyAmount.toString(),
        path: [token1.address, token2.address],
      });

      const tradeResources = await signer.provider.estimateResources(tradeTransaction);
      const tradeExtrinsic = signer.provider.api.tx.evm.call(
        tradeTransaction.to,
        tradeTransaction.data,
        toBN(tradeTransaction.value || 0),
        toBN(tradeResources.gas),
        tradeResources.storage.lt(0) ? toBN(0) : toBN(tradeResources.storage),
      );

      // Track trade signed and sent
      analytics_formo?.track('trade_signed_and_sent', basePayload);
      analytics_formo?.transaction({
        status: TransactionStatus.BROADCASTED,
        address: evmAddress!,
        chainId: CHAIN_ID,
      });

      const signAndSendTrade = new Promise<void>((resolve, reject) => {
        tradeExtrinsic.signAndSend(
          address,
          { signer: signer.signingKey },
          (status: any) => {
            const err = captureError(status.events);
            if (err) {
              // Track trade error
              analytics_formo?.track('trade_error', {
                ...basePayload,
                stage: 'sign_and_send',
                errorMessage: err,
              });
              reject({ message: err });
            }
            if (status.dispatchError) {
              // Track trade error
              analytics_formo?.track('trade_error', {
                ...basePayload,
                stage: 'dispatch',
                errorMessage: status.dispatchError.toString(),
              });
              console.error(status.dispatchError.toString());
              reject({ message: status.dispatchError.toString() });
            }
            if (status.status.isInBlock) {
              // Track trade in block
              analytics_formo?.track('trade_in_block', basePayload);
              analytics_formo?.transaction({
                status: TransactionStatus.BROADCASTED,
                address: evmAddress!,
                chainId: CHAIN_ID,
              });
              resolve();
            }
            if (status.status.isFinalized) {
              // Track trade finalized
              analytics_formo?.track('trade_finalized', basePayload);
              analytics_formo?.transaction({
                status: TransactionStatus.CONFIRMED,
                address: evmAddress!,
                chainId: CHAIN_ID,
              });
              
              if (onFinalized) onFinalized();
              Uik.notify.success({
                message: 'Blocks have been finalized',
                aliveFor: 10,
              });
            }
          },
        );
      });
      await signAndSendTrade;
    }

    // Track swap completed
    analytics_formo?.track('swap_completed', {
      ...basePayload,
      success: true,
    });

    if (onSuccess) onSuccess();

    Uik.notify.success({
      message: 'Trade complete.\nBalances will reload after blocks are finalized',
      aliveFor: 10,
    });

    Uik.dropConfetti();
  } catch (error) {
    // Track swap failed (catch-all for any unhandled errors)
    analytics_formo?.track('swap_failed', {
      ...basePayload,
      errorMessage: errorHandler(error.message),
    });

    const message = errorHandler(error.message);
    Uik.notify.danger({
      message: `An error occurred while trying to complete your trade: ${message}`,
      aliveFor: 10,
    });
  } finally {
    await updateTokenState().catch(() => Uik.notify.danger({
      message: 'Please reload the page to update token balances',
      aliveFor: 10,
    }));

    dispatch(setLoadingAction(false));
    dispatch(clearTokenAmountsAction());
  }
};
