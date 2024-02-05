import { AxiosInstance } from 'axios';
import { useState } from 'react';
import { ALL_POOLS, PoolQueryObject } from '../graphql/pools';
import { PoolWithReserves } from '../state';
import { graphqlRequest } from '../graphql/utils';
import { getIconUrl } from '../components/common/Icons';
import { useAsyncEffect } from './useAsyncEffect';

export const getAllPoolsQuery = (): PoolQueryObject => ({
  query: ALL_POOLS,
  variables: {},
});
export const useAllPools = (httpClient: AxiosInstance): PoolWithReserves[] => {
  const [allPools, setAllPools] = useState([]);
  const [poolsCount,setPoolsCount] = useState(0);
  const getAllPoolsQry = getAllPoolsQuery();

  useAsyncEffect(async()=>{
       const response = await graphqlRequest(httpClient, getAllPoolsQry);
    const pools = response.data.data?.allPools.map((pool) => ({
      ...pool,
      iconUrl1: pool.iconUrl1 === '' ? getIconUrl(pool.token1) : pool.iconUrl1,
      iconUrl2: pool.iconUrl2 === '' ? getIconUrl(pool.token2) : pool.iconUrl2,
    }));
    if(allPools.length!==pools.length)setPoolsCount(pools.length);
    setAllPools(pools);
  },[poolsCount])

  return allPools;
};
