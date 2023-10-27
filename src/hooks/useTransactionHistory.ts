import { reefState } from '@reef-chain/util-lib';
import { TokenTransfer } from '../state';
import { useObservableState } from './useObservableState';

type UseTxHistory = TokenTransfer[];
export const useTxHistory = (): UseTxHistory => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txHistory:any = useObservableState(reefState.selectedTransactionHistory_status$);
  let txHistoryData;
  if (txHistory && txHistory._status[0].code === 6) {
    txHistoryData = txHistory.data;
  }

  return txHistoryData;
};
