import BigNumber from 'bignumber.js';
import { useEffect, useMemo, useState } from 'react';
import { AxiosInstance } from 'axios';
import {
  AllPoolsListCountQuery,
  AllPoolsListQuery,
  ALL_POOLS_LIST,
  ALL_POOLS_LIST_COUNT,
  PoolListItem,
  PoolsListVar,
  UserPoolsListCountQuery,
  UserPoolsListQuery,
  USER_POOLS_LIST,
  USER_POOLS_LIST_COUNT,
  PoolQueryObject, PoolQueryType,
} from '../graphql/pools';
import { TokenPrices } from '../state';
import { graphqlRequest } from '../graphql/utils';
import { tokenIconUtils } from '@reef-chain/util-lib';
import { useAsyncEffect } from './useAsyncEffect';
import { getIconUrl } from '../components/common/Icons';

interface PoolItem {
  address: string;
  tvl: string;
  volume24h: string;
  volumeChange24h: number;
  myLiquidity?: string;
  token1: {
    name: string;
    image: string;
  };
  token2: {
    name: string;
    image: string;
  };
}

interface UsePoolsList extends PoolsListVar {
  tokenPrices: TokenPrices;
  httpClient: AxiosInstance;
  queryType: PoolQueryType;
}

const calculate24hVolumeUSD = ({
  token1,
  token2,
  dayVolume1,
  dayVolume2,
  prevDayVolume1,
  prevDayVolume2,
  decimals1,
  decimals2,
}: PoolListItem,
tokenPrices: TokenPrices,
current: boolean): BigNumber => {
  const v1 = current ? dayVolume1 : prevDayVolume1;
  const v2 = current ? dayVolume2 : prevDayVolume2;
  if (v1 === null && v2 === null) return new BigNumber(0);
  const dv1 = new BigNumber(v1 === null ? 0 : v1)
    .div(new BigNumber(10).pow(decimals1))
    .multipliedBy(tokenPrices[token1]);
  const dv2 = new BigNumber(v2 === null ? 0 : v2)
    .div(new BigNumber(10).pow(decimals2))
    .multipliedBy(tokenPrices[token2]);

  return dv1.plus(dv2).toString()=="NaN"? new BigNumber(0) :dv1.plus(dv2);
};

const calculateVolumeChange = (pool: PoolListItem, tokenPrices: TokenPrices): number => {
  const current = calculate24hVolumeUSD(pool, tokenPrices, true);
  const previous = calculate24hVolumeUSD(pool, tokenPrices, false);
  if (previous.eq(0) && current.eq(0)) return 0;
  if (previous.eq(0)) return 100;
  if (current.eq(0)) return -100;
  const res = current.minus(previous).div(previous).multipliedBy(100);
  return res.toNumber();
};

const calculateUSDTVL = ({
  reserved1,
  reserved2,
  decimals1,
  decimals2,
  token1,
  token2,
}: PoolListItem,
tokenPrices: TokenPrices): string => {
  const r1 = new BigNumber(reserved1).div(new BigNumber(10).pow(decimals1)).multipliedBy(tokenPrices[token1] || 0);
  const r2 = new BigNumber(reserved2).div(new BigNumber(10).pow(decimals2)).multipliedBy(tokenPrices[token2] || 0);
  const result = r1.plus(r2).toFormat(2);
  return result === 'NaN' ? '0' : result;
};

const calculateUserLiquidity = (
  {
    token1, token2, userLockedAmount1, userLockedAmount2, decimals1, decimals2,
  }: PoolListItem,
  tokenPrices: TokenPrices,
): string|undefined => {
  const v1 = new BigNumber(userLockedAmount1 === null ? '0' : userLockedAmount1)
    .div(new BigNumber(10).pow(decimals1))
    .multipliedBy(tokenPrices[token1]);
  const v2 = new BigNumber(userLockedAmount2 === null ? '0' : userLockedAmount2)
    .div(new BigNumber(10).pow(decimals2))
    .multipliedBy(tokenPrices[token2]);
  const res = v1.plus(v2);

  return res.gt(0) ? res.toFormat(2) : "0";
};

const getUserPoolList = (queryType: PoolQueryType, limit: number, offset: number, search: string, signerAddress: string): PoolQueryObject => ({
  query: queryType === 'User' ? USER_POOLS_LIST : ALL_POOLS_LIST,
  variables: {
    limit, offset, search, signerAddress,
  },
});

const getUserPoolCountQry = (queryType: PoolQueryType, search: string, signerAddress: string): PoolQueryObject => ({
  query: queryType === 'User' ? USER_POOLS_LIST_COUNT : ALL_POOLS_LIST_COUNT,
  variables: { search, signerAddress },
});

export const usePoolsList = ({
  limit, offset, search, signerAddress, tokenPrices, queryType, httpClient,
}: UsePoolsList): [PoolItem[], boolean, number] => {
  const [dataPoolsList, setdataPoolsList] = useState<AllPoolsListQuery | UserPoolsListQuery|undefined>();
  const [dataPoolsCount, setDataPoolsCount] = useState<AllPoolsListCountQuery | UserPoolsListCountQuery|undefined>();
  const [loadingPoolsList, setLoadingPoolsList] = useState<boolean>(true);
  const [loadingPoolsCount, setLoadingPoolsCount] = useState<boolean>(true);
  const [tokenAddresses, setTokenAddresses] = useState<string[]>([]);
  const [tokenIconsMap, setTokenIconsMap] = useState({});

  useEffect(() => {
    const handleResp = async (): Promise<void> => {
      const userPoolQry = getUserPoolList(queryType, limit, offset, search, signerAddress);
      setLoadingPoolsList(true);
      const response = await graphqlRequest(httpClient, userPoolQry);
      setdataPoolsList(response.data.data);
      setLoadingPoolsList(false);
    };
    handleResp();
  }, [limit, offset,search,signerAddress]);

  const getReefInfuraUrl = (url:string)=>{
    if(!url)return url;
    if(url.includes("cloudflare-ipfs.com")){
      return url.replace("cloudflare-ipfs.com","reef.infura-ipfs.io")
    }
    return url;
  }

  const userPoolCountQry = getUserPoolCountQry(queryType, search, signerAddress);
  useEffect(() => {
    const handleResp = async (): Promise<void> => {
      setLoadingPoolsCount(true);
      const response = await graphqlRequest(httpClient, userPoolCountQry);
      setDataPoolsCount(response.data.data);
      setLoadingPoolsCount(false);
    };
    handleResp();
  }, []);

  useAsyncEffect(async()=>{
    if(tokenAddresses.length){
      const _fetchedTokenIconsMap = await tokenIconUtils.resolveTokenUrl(tokenAddresses);
      setTokenIconsMap(_fetchedTokenIconsMap)
    }
  },[dataPoolsList])

  const processed = useMemo((): PoolItem[] => {
    if (!dataPoolsList) return [];
    const poolsList = queryType === 'User'
      ? (dataPoolsList as UserPoolsListQuery).userPoolsList
      : (dataPoolsList as AllPoolsListQuery).allPoolsList;
    
    let emptyTokenIconsAddresses: string[] = []
    let _tokenIconsMap={};
  
    poolsList.map((pool) => {
      if (!pool.iconUrl1) emptyTokenIconsAddresses.push(pool.token1);
      else _tokenIconsMap[pool.token1]=pool.iconUrl1
      if (!pool.iconUrl2) emptyTokenIconsAddresses.push(pool.token2);
      else _tokenIconsMap[pool.token2]=pool.iconUrl2
    })

    if(tokenAddresses!=emptyTokenIconsAddresses){
      setTokenAddresses(emptyTokenIconsAddresses);
    }

    const mergedTokenIconsMap = {
      ...tokenIconsMap,
      ..._tokenIconsMap
    }

    const mappedPools = poolsList.map((pool) => ({
      address: pool.id,
      token1: {
        image: !pool.iconUrl1 ? getReefInfuraUrl(mergedTokenIconsMap[pool.token1])??getReefInfuraUrl(getIconUrl(pool.token1)) : getReefInfuraUrl(pool.iconUrl1),
        name: pool.name1,
        address:pool.token1
      },
      token2: {
        image: !pool.iconUrl2 ? getReefInfuraUrl(mergedTokenIconsMap[pool.token2])??getReefInfuraUrl(getIconUrl(pool.token2))  : getReefInfuraUrl(pool.iconUrl2),
        name: pool.name2,
        address:pool.token2
            },
      tvl: calculateUSDTVL(pool, tokenPrices),
      volume24h: calculate24hVolumeUSD(pool, tokenPrices, true).toFormat(2),
      volumeChange24h: calculateVolumeChange(pool, tokenPrices),
      myLiquidity: calculateUserLiquidity(pool, tokenPrices),
    }));


    return queryType === 'User'
      ? mappedPools.filter(pool => pool.myLiquidity && new BigNumber(pool.myLiquidity).isGreaterThan(0.1))
      : mappedPools;

  }, [dataPoolsList,tokenIconsMap]);


  let count = 0;

  if (dataPoolsCount) {
    count = queryType === 'User'
      ? (dataPoolsCount as UserPoolsListCountQuery).userPoolsListCount
      : (dataPoolsCount as AllPoolsListCountQuery).allPoolsListCount;
  }

  return [
    processed,
    loadingPoolsList || loadingPoolsCount,
    count,
  ];
};