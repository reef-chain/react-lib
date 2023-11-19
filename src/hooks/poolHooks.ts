import axios, { AxiosInstance } from 'axios';
import { useEffect, useState } from 'react';
import { network } from '@reef-chain/util-lib';
import { graphqlRequest } from '../graphql/utils';
import {
  PoolBasicTransactionVar, PoolDayFeeQuery, PoolDayVolumeQuery, PoolFeeQuery,
  PoolQuery, PoolReservesQuery, PoolSupplyQuery, PoolTransactionCountQuery,
  PoolTransactionQuery, PoolDayTvlQuery, PoolVolumeAggregateQuery,
  POOL_CURRENT_RESERVES_GQL, POOL_DAY_FEE_QUERY_GQL, POOL_DAY_TVL_GQL,
  POOL_DAY_VOLUME_GQL, POOL_FEES_GQL, POOL_GQL, POOL_SUPPLY_GQL, POOL_TRANSACTIONS_GQL, POOL_TRANSACTION_COUNT_GQL,
  POOL_VOLUME_AGGREGATE_GQL, TransactionTypes, PoolQueryObject,
} from '../graphql/pools';
import { useObservableState } from './useObservableState';

const getPoolVolumeAggregateQuery = (address: string,
  fromTime: string,
  toTime: string): PoolQueryObject => ({
  query: POOL_VOLUME_AGGREGATE_GQL,
  variables: {
    address,
    fromTime,
    toTime,
  },
});

// Intermediate query hooks
export const useDayVolume = (
  address: string,
  fromTime: string,
  toTime: string,
): PoolVolumeAggregateQuery => {
  const [data, setData] = useState<PoolVolumeAggregateQuery|undefined>();
  const poolCurrReservesQry = getPoolVolumeAggregateQuery(address, fromTime, toTime);
  useEffect(() => {
    const handleResponse = async (): Promise<void> => {
      const response = await graphqlRequest(axios, poolCurrReservesQry);
      setData(response.data);
    };
    handleResponse();
  }, []);

  return data as any;
};

const getPoolSupplyQuery = (address: string): PoolQueryObject => ({
  query: POOL_SUPPLY_GQL,
  variables: { address },
});

export const useCurrentPoolSupply = (
  address: string,
): PoolSupplyQuery => {
  const [data, setData] = useState<PoolSupplyQuery|undefined>();
  const poolCurrReservesQry = getPoolSupplyQuery(address);
  useEffect(() => {
    const handleResponse = async (): Promise<void> => {
      const response = await graphqlRequest(axios, poolCurrReservesQry);
      setData(response.data);
    };
    handleResponse();
  }, []);

  return data as any;
};

export const getPoolFeesQuery = (address: string, fromTime: string): PoolQueryObject => ({
  query: POOL_FEES_GQL,
  variables: {
    address,
    fromTime,
  },
});

export const useDayFee = (
  address: string,
  fromTime: string,
): PoolFeeQuery => {
  const [data, setData] = useState<PoolSupplyQuery|undefined>();
  const poolCurrReservesQry = getPoolFeesQuery(address, fromTime);
  useEffect(() => {
    const handleResponse = async (): Promise<void> => {
      const response = await graphqlRequest(axios, poolCurrReservesQry);
      setData(response.data);
    };
    handleResponse();
  }, []);

  return data as any;
};

const getPoolQuery = (address: string): PoolQueryObject => ({
  query: POOL_GQL,
  variables: { address },
});

export const usePoolQuery = (address: string): PoolQuery => {
  const [data, setData] = useState<PoolQuery|undefined>();
  const poolQry = getPoolQuery(address);
  useEffect(() => {
    const handleResponse = async (): Promise<void> => {
      const response = await graphqlRequest(axios, poolQry);
      setData(response.data);
    };
    handleResponse();
  }, []);

  return data as any;
};

const getPoolCurrentReservesQry = (address: string): PoolQueryObject => ({
  query: POOL_CURRENT_RESERVES_GQL,
  variables: { address },
});

export const useCurrentPoolReserve = (
  address: string,
): PoolReservesQuery => {
  const [data, setData] = useState<PoolReservesQuery|undefined>();
  const poolCurrReservesQry = getPoolCurrentReservesQry(address);
  useEffect(() => {
    const handleResponse = async (): Promise<void> => {
      const response = await graphqlRequest(axios, poolCurrReservesQry);
      setData(response.data);
    };
    handleResponse();
  }, []);

  return data as any;
};

const resolveTransactionVariables = (
  search: string | undefined,
  type: TransactionTypes,
): PoolBasicTransactionVar => ({
  search: search || '',
  type: type === 'All' ? ['Swap', 'Mint', 'Burn'] : [type],
});

const getPoolTransactionCountQry = (address: string | undefined, type: TransactionTypes): PoolQueryObject => ({
  query: POOL_TRANSACTION_COUNT_GQL,
  variables: resolveTransactionVariables(address, type),
});

const getPoolTransactionQry = (address: string | undefined, type: TransactionTypes, limit: number, pageIndex: number): {query: string, variables: any} => ({
  query: POOL_TRANSACTIONS_GQL,
  variables: {
    ...resolveTransactionVariables(address, type),
    limit,
    offset: pageIndex * limit,
  },
});

export const usePoolTransactionCountSubscription = (
  address: string | undefined,
  type: TransactionTypes,
  httpClient: AxiosInstance,
): {data:PoolTransactionCountQuery, loading:boolean} => {
  const [data, setData] = useState<PoolTransactionCountQuery|undefined>();
  const [loading, setLoading] = useState<boolean>(true);
  const queryObj = getPoolTransactionCountQry(address, type);
  const TRIGGER = useObservableState(network.getLatestBlockContractEvents$([address]));
  useEffect(() => {
    const handleResponse = async (): Promise<void> => {
      const response = await graphqlRequest(httpClient, queryObj);
      setData(response.data.data);
      setLoading(false);
    };
    handleResponse();
  }, [TRIGGER]);

  if (httpClient === undefined) {
    return [undefined, true] as any;
  }

  return { data, loading } as any;
};

export const usePoolTransactionSubscription = (
  address: string | undefined,
  type: TransactionTypes,
  pageIndex = 0,
  limit = 10,
  httpClient: AxiosInstance,
): {data:PoolTransactionQuery, loading:boolean} => {
  const [data, setData] = useState<PoolTransactionQuery|undefined>();
  const [loading, setLoading] = useState<boolean>(true);
  const queryObj = getPoolTransactionQry(address, type, limit, pageIndex);
  const TRIGGER = useObservableState(network.getLatestBlockContractEvents$([address]));
  useEffect(() => {
    const fetchResponse = async (): Promise<void> => {
      const response = await graphqlRequest(httpClient, queryObj);
      setData(response.data.data);
      setLoading(false);
    };
    fetchResponse();
  }, [TRIGGER]);

  if (httpClient === undefined) {
    return [undefined, true] as any;
  }

  return { data, loading } as any;
};

const getPoolDayTvlQuery = (address: string, fromTime: string): PoolQueryObject => ({
  query: POOL_DAY_TVL_GQL,
  variables: {
    address,
    fromTime,
  },
});

export const useDayTvl = (
  address: string,
  fromTime: number,
): PoolDayTvlQuery => {
  const [data, setData] = useState<PoolDayVolumeQuery|undefined>();
  const poolCurrReservesQry = getPoolDayTvlQuery(address, new Date(fromTime).toISOString());
  useEffect(() => {
    const handleResponse = async (): Promise<void> => {
      const response = await graphqlRequest(axios, poolCurrReservesQry);
      setData(response.data);
    };
    handleResponse();
  }, []);

  return data as any;
};

const getPoolDayVolumeQuery = (address: string, fromTime: string): PoolQueryObject => ({
  query: POOL_DAY_VOLUME_GQL,
  variables: {
    address,
    fromTime,
  },
});

export const useDayPoolVolume = (
  address: string,
  fromTime: number,
): PoolDayVolumeQuery => {
  const [data, setData] = useState<PoolDayVolumeQuery|undefined>();
  const poolCurrReservesQry = getPoolDayVolumeQuery(address, new Date(fromTime).toISOString());
  useEffect(() => {
    const handleResponse = async (): Promise<void> => {
      const response = await graphqlRequest(axios, poolCurrReservesQry);
      setData(response.data);
    };
    handleResponse();
  }, []);

  return data as any;
};

const getPoolDayFeeQuery = (address: string, fromTime: string): PoolQueryObject => ({
  query: POOL_DAY_FEE_QUERY_GQL,
  variables: {
    address,
    fromTime,
  },
});

export const useDayPoolFee = (
  address: string,
  fromTime: number,
): PoolDayFeeQuery => {
  const [data, setData] = useState<PoolDayFeeQuery|undefined>();
  const poolCurrReservesQry = getPoolDayFeeQuery(address, new Date(fromTime).toISOString());
  useEffect(() => {
    const handleResponse = async (): Promise<void> => {
      const response = await graphqlRequest(axios, poolCurrReservesQry);
      setData(response.data);
    };
    handleResponse();
  }, []);

  return data as any;
};
