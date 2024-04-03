import { reefState, tokenUtil } from '@reef-chain/util-lib';
import { useEffect, useState } from 'react';
import { useObservableState } from './useObservableState';

const { FeedbackStatusCode } = reefState;

type UseTxHistory = [tokenUtil.TokenTransfer[], boolean];
export const useTxHistory = (): UseTxHistory => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txHistoryStatus: reefState.StatusDataObject<tokenUtil.TokenTransfer[]>|undefined = useObservableState(reefState.selectedTransactionHistory_status$);
  const [history, setHistory] = useState<tokenUtil.TokenTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(!txHistoryStatus || txHistoryStatus?.hasStatus(FeedbackStatusCode.LOADING));
    if (txHistoryStatus) {
      setHistory(txHistoryStatus.data);
    }
  }, [txHistoryStatus]);

  return [history, loading];
};
