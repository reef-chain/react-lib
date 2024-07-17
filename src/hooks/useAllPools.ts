import { AxiosInstance } from 'axios';
import { useState } from 'react';
import { ALL_POOLS, PoolQueryObject } from '../graphql/pools';
import { PoolWithReserves } from '../state';
import { graphqlRequest } from '../graphql/utils';
import { useAsyncEffect } from './useAsyncEffect';
import { tokenIconUtils } from '@reef-chain/util-lib';
import { getIconUrl } from '../components/common/Icons';

export const getAllPoolsQuery = (): PoolQueryObject => ({
  query: ALL_POOLS,
  variables: {},
});
export const useAllPools = (httpClient: AxiosInstance): PoolWithReserves[] => {
  const [allPools, setAllPools] = useState([]);
  const [poolsCount, setPoolsCount] = useState(0);

  const getAllPoolsQry = getAllPoolsQuery();

  useAsyncEffect(async () => {
    // create empty icons addresses, which will be later used for map creation
    let emptyTokenIconsAddresses: string[] = []
    let tokenIconsMap={};

    const response = await graphqlRequest(httpClient, getAllPoolsQry);
    response.data.data?.allPools.map((pool) => {
      if (pool.iconUrl1 == "") emptyTokenIconsAddresses.push(pool.token1);
      else tokenIconsMap[pool.token1]=pool.iconUrl1
      if (pool.iconUrl2 == "") emptyTokenIconsAddresses.push(pool.token2);
      else tokenIconsMap[pool.token2]=pool.iconUrl2
    })

    if(emptyTokenIconsAddresses.length){
      const _tokenIconsMap = await tokenIconUtils.resolveTokenUrl(emptyTokenIconsAddresses);
      tokenIconsMap={
        ..._tokenIconsMap,
        ...tokenIconsMap
      }
    }

    const pools = response.data.data?.allPools.map((pool) => ({
      ...pool,
      iconUrl1: pool.iconUrl1 === '' ? tokenIconsMap[pool.token1]??getIconUrl(pool.token1)  : pool.iconUrl1,
      iconUrl2: pool.iconUrl2 === '' ? tokenIconsMap[pool.token2]??getIconUrl(pool.token2)  : pool.iconUrl2,
    }));
    if (allPools.length !== pools.length) setPoolsCount(pools.length);
    setAllPools(pools);
  }, [poolsCount])

  return allPools;
};
