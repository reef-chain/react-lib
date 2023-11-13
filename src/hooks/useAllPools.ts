import { AxiosInstance } from 'axios';
import { useState } from 'react';
import { ALL_POOLS, PoolQueryObject } from '../graphql/pools';
import { POLL_INTERVAL } from '../utils';
import useInterval from './userInterval';
import { PoolWithReserves } from '../state';
import { graphqlRequest } from '../graphql/utils';
import { getIconUrl } from '../components/common/Icons';

export const getAllPoolsQuery = (): PoolQueryObject => ({
  query: ALL_POOLS,
  variables: {},
});
export const useAllPools = (httpClient: AxiosInstance): PoolWithReserves[] => {
  const [allPools, setAllPools] = useState([]);
  const getAllPoolsQry = getAllPoolsQuery();

  useInterval(async () => {
    const response = await graphqlRequest(httpClient, getAllPoolsQry);
    const pools = response.data.data?.allPools.map((pool) => ({
      ...pool,
      iconUrl1: pool.iconUrl1 === '' ? getIconUrl(pool.token1) : pool.iconUrl1,
      iconUrl2: pool.iconUrl2 === '' ? getIconUrl(pool.token2) : pool.iconUrl2,
    }));
    setAllPools(pools);
  }, POLL_INTERVAL);

  return allPools;
};
