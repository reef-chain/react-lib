import { useEffect, useState } from 'react';
import { BigNumber } from 'ethers';
import {network} from "@reef-chain/util-lib";
import {
  DataProgress,
  DataWithProgress,
  getData,
  isDataSet,
} from '../utils/dataWithProgress';
import {
   ReefSigner, reefTokenWithAmount, Token,
} from '../state';
import { loadSignerTokens } from '../api/tokens';

type Network = network.Network;

export const useLoadSignerTokens = (
  refreshToggle: boolean,
  network: Network,
  signer?: ReefSigner,
): DataWithProgress<Token[]> => {
  const [tokens, setTokens] = useState<DataWithProgress<Token[]>>(
    DataProgress.LOADING,
  );
  useEffect(() => {
    if (!signer) {
      return;
    }
    const fetchTokens = async (): Promise<void> => {
      if (!signer) {
        setTokens(DataProgress.LOADING);
        return;
      }
      const selectedAccountTokens: Token[] | null = await loadSignerTokens(
        signer,
        network,
      );
      if (!selectedAccountTokens) {
        setTokens(DataProgress.NO_DATA);
        return;
      }
      setTokens(selectedAccountTokens);
    };
    fetchTokens();
  }, [signer, refreshToggle]);

  useEffect(() => {
    if (isDataSet(tokens) && getData(tokens)?.length) {
      const tkns = tokens as Token[];
      const { address: reefAddr } = reefTokenWithAmount();
      const reefToken = tkns.find((t) => t.address === reefAddr);
      if (reefToken) {
        reefToken.balance = signer?.balance || BigNumber.from(0);
        setTokens([...tkns]);
      }
    }
  }, [signer?.balance]);

  return tokens;
};
