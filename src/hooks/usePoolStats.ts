import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo, useState } from 'react';
import { network, tokenIconUtils } from '@reef-chain/util-lib';
import { AxiosInstance } from 'axios';
import {
  Pool24HVolume,
  PoolInfoQuery,
  PoolsTotalSupply,
  PoolTokensDataQuery,
  PoolQueryObject,
  POOLS_TOTAL_VALUE_LOCKED,
  POOL_24H_VOLUME,
  POOL_INFO_GQL,
  POOL_TOKENS_DATA_GQL,
} from '../graphql/pools';
import { getTokenPrice, TokenPrices } from '../state';
import { normalize } from '../utils';
import { graphqlRequest } from '../graphql/utils';
import { getIconUrl } from '../components/common/Icons';
import { useAsyncEffect } from './useAsyncEffect';
import { useObservableState } from './useObservableState';
import { getReefInfuraUrl } from './usePoolLists';

const getPoolTotalValueLockedQry = (toTime: string): PoolQueryObject => ({
  query: POOLS_TOTAL_VALUE_LOCKED,
  variables: { toTime },
});
const getPool24HvolQry = (fromTime: string): PoolQueryObject => ({
  query: POOL_24H_VOLUME,
  variables: { fromTime },
});
const getPoolTokensDataQry = (address: string): PoolQueryObject => ({
  query: POOL_TOKENS_DATA_GQL,
  variables: { address },
});
const getPoolInfoQry = (address:string, signerAddress:string, fromTime:string, toTime:string): PoolQueryObject => ({
  query: POOL_INFO_GQL,
  variables: {
    address, signerAddress, fromTime, toTime,
  },
});

export const useTotalSupply = (tokenPrices: TokenPrices, httpClient: AxiosInstance, previous = false): string => {
  const [data, setData] = useState<PoolsTotalSupply|undefined>();
  const toTime = useMemo(() => {
    const tm = new Date();
    if (previous) {
      tm.setDate(tm.getDate() - 1);
    }
    return tm;
  }, []);

  useEffect(() => {
    const handleRes = async (): Promise<void> => {
      const res = await graphqlRequest(httpClient, getPoolTotalValueLockedQry(toTime.toISOString()));
      setData(res.data.data);
    };
    handleRes();
  }, []);

  // const { data } = useQuery<PoolsTotalSupply, PoolsTotalValueLockedVar>(
  //   POOLS_TOTAL_VALUE_LOCKED,
  //   {
  //     client: dexClient,
  //     variables: { toTime: toTime.toISOString() },
  //   },
  // );
  if (!data || data.totalSupply.length === 0) {
    return '0';
  }

  const totalSupply = data.totalSupply.reduce((acc, { reserved1, reserved2, pool: { token1, token2 } }) => {
    const tokenPrice1 = getTokenPrice(token1, tokenPrices);
    const tokenPrice2 = getTokenPrice(token2, tokenPrices);
    const r1 = tokenPrice1.multipliedBy(new BigNumber(reserved1).div(new BigNumber(10).pow(18)));
    const r2 = tokenPrice2.multipliedBy(new BigNumber(reserved2).div(new BigNumber(10).pow(18)));
    return acc.plus(r1).plus(r2);
  }, new BigNumber(0));

  return totalSupply.toString();
};

export const usePoolVolume = (tokenPrices: TokenPrices, httpClient:AxiosInstance): string => {
  const [data, setData] = useState<Pool24HVolume|undefined>();

  const fromTime = useMemo(
    () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    [],
  );

  useEffect(() => {
    const handleRes = async (): Promise<void> => {
      const res = await graphqlRequest(httpClient, getPool24HvolQry(fromTime));
      setData(res.data.data);
    };
    handleRes();
  }, []);

  // const { data } = useQuery<Pool24HVolume, PoolVolume24HVar>(
  //   POOL_24H_VOLUME,
  //   {
  //     client: dexClient,
  //     variables: { fromTime },
  //   },
  // );
  if (!data || data.volume.length === 0) {
    return '0';
  }

  return data.volume.reduce((acc, { amount1, amount2, pool: { token1, token2 } }) => {
    const tokenPrice1 = getTokenPrice(token1, tokenPrices);
    const tokenPrice2 = getTokenPrice(token2, tokenPrices);

    return acc
      .plus(tokenPrice1.multipliedBy(new BigNumber(amount1).div(new BigNumber(10).pow(18))))
      .plus(tokenPrice2.multipliedBy(new BigNumber(amount2).div(new BigNumber(10).pow(18))));
  }, new BigNumber(0)).toString();
};

export interface TokenStats {
  address: string;
  name: string;
  icon: string;
  symbol: string;
  decimals: number;
  fees24h: string;
  mySupply: string;
  amountLocked: string;

  percentage: string;
  ratio: {
    name: string;
    symbol: string;
    amount: string;
  }
}

export interface PoolStats {
  firstToken: TokenStats;
  secondToken: TokenStats;
  tvlUSD: string;
  mySupplyUSD: string;
  volume24hUSD: string;
  volumeChange24h: number;
}

export const usePoolInfo = (address: string, signerAddress: string, tokenPrices: TokenPrices, httpClient: AxiosInstance): [PoolStats|undefined, boolean] => {
  const [tokensData, setTokensData] = useState<PoolTokensDataQuery|undefined>();
  const [poolInfoData, setPoolInfoData] = useState<PoolInfoQuery|undefined>();
  const [tokenIconsMap,setTokenIconMap] = useState<any>();
  const [tokensLoading, setTokensLoading] = useState<boolean>(true);
  const [poolInfoLoading, setPoolInfoLoading] = useState<boolean>(true);
  const toTime = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString();
  }, [address, signerAddress]);

  const fromTime = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 2);
    return date.toISOString();
  }, [address, signerAddress]);

  // const { data: tokensData, loading: tokensLoading } = useQuery<PoolTokensDataQuery, PoolTokensVar>(POOL_TOKENS_DATA_GQL, {
  //   client: dexClient,
  //   variables: { address },
  // });
  useEffect(() => {
    const handleRes = async (): Promise<void> => {
      const res = await graphqlRequest(httpClient, getPoolTokensDataQry(address));
      setTokensData(res.data.data);
      setTokensLoading(false);
    };
    handleRes();
  }, [address]);

  // const { data: poolInfoData, loading: poolInfoLoading, refetch: refetchPoolInfo } = useQuery<PoolInfoQuery, PoolInfoVar>(POOL_INFO_GQL, {
  //   client: dexClient,
  //   variables: {
  //     address, signerAddress, fromTime, toTime,
  //   },
  // });

  const queryObj = getPoolInfoQry(address, signerAddress, fromTime, toTime);

  const TRIGGER = useObservableState(network.getLatestBlockContractEvents$([address]))

  useAsyncEffect(async()=>{
    setPoolInfoLoading(true);
    const response = await graphqlRequest(httpClient, queryObj);
    setPoolInfoData(response.data.data);
    setPoolInfoLoading(false);
  },[TRIGGER])


  useAsyncEffect(async()=>{
    if(tokensData){
      // resolving token icons
      const { token1,token2 } = tokensData!.poolById;

      let tokenAddresses:string[] = [];

      if(token1.iconUrl=='')tokenAddresses.push(token1.id);
      if(token2.iconUrl=='')tokenAddresses.push(token2.id);

      const _tokenIconMap = await tokenIconUtils.resolveTokenUrl(tokenAddresses);
      setTokenIconMap(_tokenIconMap);
    }
  },[tokensData])

  const info = useMemo<PoolStats|undefined>(() => {
    if (!poolInfoData || !tokensData) {
      return undefined;
    }

    const pool = poolInfoData.poolInfo;
    const { token1 } = tokensData!.poolById;
    const { token2 } = tokensData!.poolById;

    const amountLocked1 = normalize(pool.reserves.reserved1, token1.decimals);
    const amountLocked2 = normalize(pool.reserves.reserved2, token2.decimals);
    const fee1 = normalize(pool.fee.fee1, token1.decimals);
    const fee2 = normalize(pool.fee.fee2, token2.decimals);
    const volume1 = normalize(pool.currentDayVolume.amount1, token1.decimals);
    const volume2 = normalize(pool.currentDayVolume.amount2, token2.decimals);
    const previousVolume1 = normalize(pool.previousDayVolume.amount1, token1.decimals);
    const previousVolume2 = normalize(pool.previousDayVolume.amount2, token2.decimals);

    const poolShare = new BigNumber(pool.userSupply).div(pool.totalSupply);

    const mySupply1 = amountLocked1.multipliedBy(poolShare);
    const mySupply2 = amountLocked2.multipliedBy(poolShare);

    const price1 = tokenPrices[token1.id] && !Number.isNaN(tokenPrices[token1.id]) ? tokenPrices[token1.id] : 0;
    const price2 = tokenPrices[token2.id] && !Number.isNaN(tokenPrices[token2.id]) ? tokenPrices[token2.id] : 0;
    const mySupplyUSD = mySupply1
      .multipliedBy(price1)
      .plus(mySupply2.multipliedBy(price2))
      .toFormat(2);
    const tvlUSD = amountLocked1
      .multipliedBy(price1)
      .plus(amountLocked2.multipliedBy(price2))
      .toFormat(2);
    const volume24hUSD = volume1
      .multipliedBy(price1)
      .plus(volume2.multipliedBy(price2));
    const prevVolume24USD = previousVolume1
      .multipliedBy(price1)
      .plus(previousVolume2.multipliedBy(price2));

    let volDiff: number;
    if (prevVolume24USD.eq(0) && volume24hUSD.eq(0)) {
      volDiff = 0;
    } else if (prevVolume24USD.isNaN() && volume24hUSD.isNaN()) {
      volDiff = 0;
    } else if (prevVolume24USD.eq(0) || prevVolume24USD.isNaN()) {
      volDiff = 100;
    } else if (volume24hUSD.eq(0) || volume24hUSD.isNaN()) {
      volDiff = -100;
    } else {
      volDiff = prevVolume24USD.minus(volume24hUSD).dividedBy(prevVolume24USD).multipliedBy(100).toNumber();
    }

    const all = amountLocked1.plus(amountLocked2);

    return {
      firstToken: {
        address: token1.id,
        icon: getReefInfuraUrl(token1.iconUrl === '' ? tokenIconsMap? tokenIconsMap[token1.id]: getIconUrl(token1.id) : token1.iconUrl),
        name: token1.name,
        symbol: token1.symbol,
        decimals: token1.decimals,
        amountLocked: amountLocked1.toFormat(0),
        fees24h: fee1.toFormat(2),
        mySupply: mySupply1.toFormat(0),
        percentage: all.isZero() ? '0' : amountLocked1.div(all).multipliedBy(100).toFormat(2),
        ratio: {
          amount: amountLocked1.div(amountLocked2).toFormat(4),
          name: token2.name,
          symbol: token2.symbol,
        },
      },
      secondToken: {
        address: token2.id,
        icon: getReefInfuraUrl(token2.iconUrl === '' ? tokenIconsMap? tokenIconsMap[token2.id]: getIconUrl(token2.id) : token2.iconUrl),
        name: token2.name,
        symbol: token2.symbol,
        decimals: token2.decimals,
        amountLocked: amountLocked2.toFormat(0),
        fees24h: fee2.toFormat(2),
        mySupply: mySupply2.toFormat(0),
        percentage: all.isZero() ? '0' : amountLocked2.div(all).multipliedBy(100).toFormat(2),
        ratio: {
          amount: amountLocked2.div(amountLocked1).toFormat(4),
          name: token1.name,
          symbol: token1.symbol,
        },
      },
      mySupplyUSD,
      tvlUSD,
      volume24hUSD: volume24hUSD.toFormat(2),
      volumeChange24h: volDiff,
    };
  }, [poolInfoData, tokensData, tokenPrices]);

  return [info, tokensLoading || poolInfoLoading];
};
