import {
  reefState,
  network as nw,
  extension as extReef,
  ReefAccount,
} from "@reef-chain/util-lib";
import { useEffect, useState } from "react";
import { Provider } from "@reef-chain/evm-provider";
import type { Signer as InjectedSigner } from "@polkadot/api/types";
import { map } from "rxjs";
import { ReefSigner } from "../state";
import { useAsyncEffect } from "./useAsyncEffect";
import { useInjectExtension } from "./useInjectExtension";
import { useObservableState } from "./useObservableState";
import { appState } from "../appState";
import { accountToSigner } from "../rpc";
import { InitReefStateOptions } from "./useInitReefState";

type Network = nw.Network;

const SELECTED_ADDRESS_IDENT = "selected_address_reef";

const getNetworkFallback = (): Network => {
  let storedNetwork;
  try {
    storedNetwork = localStorage.getItem(appState.ACTIVE_NETWORK_LS_KEY);
    storedNetwork = JSON.parse(storedNetwork);

    storedNetwork = nw.AVAILABLE_NETWORKS[storedNetwork.name];
  } catch (e) {
    // when cookies disabled localStorage can throw
  }

  return storedNetwork != null ? storedNetwork : nw.AVAILABLE_NETWORKS.mainnet;
};

const getSelectedAddress = (): string | undefined => {
  let storedAddress: string;
  try {
    storedAddress = localStorage.getItem(SELECTED_ADDRESS_IDENT)!;
  } catch (e) {
    // when cookies disabled localStorage can throw
  }
  return storedAddress! != null ? storedAddress : undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reefAccountToReefSigner = (
  accounts: extReef.InjectedAccountWithMeta[],
  injectedSigner: InjectedSigner
): any => {
  const resultObj = {
    name: "reef",
    sig: injectedSigner,
    accounts: [],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reefSigners = <any[]>[];
  for (let i = 0; i < accounts.length; i += 1) {
    const reefAccount = accounts[i];
    const toReefSigner = {
      name: reefAccount.meta.name,
      address: reefAccount.address,
      source: reefAccount.meta.source,
      genesisHash: reefAccount.meta.genesisHash,
    };
    reefSigners.push(toReefSigner);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resultObj.accounts = reefSigners as any;
  return resultObj;
};

interface State {
  error: { code?: number; message: string; url?: string } | undefined;
  loading: boolean;
  provider: Provider | undefined;
  network: Network;
  signers: ReefSigner[];
  selectedReefSigner?: ReefSigner;
  reefState: any;
  extension: extReef.InjectedExtension | undefined;
}

export const useInitReefStateExtension = (
  applicationDisplayName: string,
  extensionIdent: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: InitReefStateOptions
): State => {
  const { network, ipfsHashResolverFn, reefscanEventsConfig } = options;
  let [extensionWithAccounts, loadingExtension, errExtension] =
    useInjectExtension(applicationDisplayName, extensionIdent);
  const [error, setError] = useState(errExtension);
  const [isSignersLoading, setIsSignersLoading] = useState<boolean>(true);
  const [allAccounts, setAllAccounts] = useState<ReefSigner[]>();
  const [initNetwork, setInitNetwork] = useState<Network>();
  const selectedNetwork: Network | undefined = useObservableState(
    reefState.selectedNetwork$
  );
  const [selectedReefSigner, setSelectedReefSigner] = useState<ReefSigner>();
  const provider = useObservableState(reefState.selectedProvider$) as
    | Provider
    | undefined;
  const [loading, setLoading] = useState(true);
  let selectedAddress: string | undefined = useObservableState(
    reefState.selectedAddress$
  );
  let accounts: ReefAccount[] | null | undefined = useObservableState(
    reefState.accounts$
  );

  useEffect(() => {
    setError(errExtension);
  }, [errExtension]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const net = network || getNetworkFallback();
    setInitNetwork(net);
    setError(undefined);

    if (!extensionWithAccounts) {
      reefState.initReefState({
        network: net,
        extension: extensionIdent,
        ipfsHashResolverFn,
        reefscanEventsConfig,
      });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const jsonAccounts = {
      accounts: extensionWithAccounts.accounts,
      injectedSigner: extensionWithAccounts.extension.signer,
    };
    reefState.initReefState({
      network: net,
      extension: extensionIdent,
      jsonAccounts,
      ipfsHashResolverFn,
      reefscanEventsConfig,
    });
  }, [extensionWithAccounts]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isProviderLoading = useObservableState(
    reefState.providerConnState$.pipe(map((v) => !(v as any).isConnected)),
    false
  );

  useEffect(() => {
    setLoading(loadingExtension || isProviderLoading || isSignersLoading);
  }, [isProviderLoading, loadingExtension, isSignersLoading]);

  useAsyncEffect(async () => {
    if (extensionWithAccounts?.accounts.length && provider) {
      const extensionAccounts = [
        reefAccountToReefSigner(extensionWithAccounts?.accounts, extensionWithAccounts.extension.signer),
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountPromises = (extensionAccounts as any).flatMap(
        // eslint-disable-next-line @typescript-eslint/no-shadow
        ({ accounts, name, sig }) =>
          accounts.map((account) =>
            accountToSigner(account, provider, sig, name)
          )
      );
      const allAccs = await Promise.all(accountPromises);
      let updatedBalanceAccounts:ReefSigner[] = [];
      let updatedBalancesMap = {};

      if(accounts){
        accounts.forEach((acc)=>updatedBalancesMap[acc.address]=acc.balance);
      }

      allAccs.forEach((acc)=>{
        updatedBalanceAccounts.push({
          balance: updatedBalancesMap[acc.address]??acc.balance,
          ...acc
        })
      })

      setAllAccounts(updatedBalanceAccounts);

      const storedAddress = getSelectedAddress();
      if (selectedAddress === undefined && storedAddress !== undefined)
        selectedAddress = storedAddress;
      if (selectedAddress) {
        setSelectedReefSigner(
          allAccs.find((acc) => acc.address === selectedAddress)
        );
        reefState.setSelectedAddress(selectedAddress);
      } else {
        setSelectedReefSigner(allAccs[0]);
        reefState.setSelectedAddress(allAccs[0].address);
      }
      setIsSignersLoading(false);
    } else {
      setAllAccounts(undefined);
      setSelectedReefSigner(undefined);
      setIsSignersLoading(false);
    }
  }, [provider, selectedAddress, initNetwork,extensionWithAccounts,accounts]);

  return {
    error,
    loading,
    provider,
    network: selectedNetwork as Network,
    signers: allAccounts as ReefSigner[],
    selectedReefSigner,
    reefState,
    extension: extensionWithAccounts?.extension,
  };
};
