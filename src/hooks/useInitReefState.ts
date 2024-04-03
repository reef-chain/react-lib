import {
  reefState,
  network as nw,
  extension as extReef,
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

type Network = nw.Network;

export const SELECTED_ADDRESS_IDENT = "selected_address_reef";

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
  accountsFromUtilLib: any,
  injectedSigner: InjectedSigner
): any => {
  const resultObj = {
    name: "reef",
    sig: injectedSigner,
    accounts: [],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reefSigners = <any[]>[];
  for (let i = 0; i < accountsFromUtilLib.length; i += 1) {
    const reefAccount = accountsFromUtilLib[i];
    const toReefSigner = {
      name: reefAccount.name,
      address: reefAccount.address,
      source: reefAccount.source,
      genesisHash: reefAccount.genesisHash,
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
  extensions: extReef.InjectedExtension[];
}

export interface InitReefStateOptions {
  network?: Network;
  ipfsHashResolverFn?: reefState.IpfsUrlResolverFn;
  reefscanEventsConfig?: reefState.ReefscanEventsConnConfig;
}

export const useInitReefState = (
  applicationDisplayName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: InitReefStateOptions
): State => {
  const { network, ipfsHashResolverFn, reefscanEventsConfig } = options;
  let [extensionsWithAccounts, loadingExtension, errExtension] =
    useInjectExtension(applicationDisplayName);
  const [error, setError] = useState(errExtension);
  const [isSignersLoading, setIsSignersLoading] = useState<boolean>(true);
  const [allAccounts, setAllAccounts] = useState<ReefSigner[]>();
  const [initNetwork, setInitNetwork] = useState<Network>();
  const selectedNetwork: Network | undefined = useObservableState(
    reefState.selectedNetwork$
  );
  const selectedExtensionIdent: string | undefined = useObservableState(
    reefState.selectedExtension$
  );
  const [selectedReefSigner, setSelectedReefSigner] = useState<ReefSigner>();
  const provider = useObservableState(reefState.selectedProvider$) as
    | Provider
    | undefined;
  const [loading, setLoading] = useState(true);
  let selectedAddress: string | undefined = useObservableState(
    reefState.selectedAddress$
  );
  const extWithAccounts = extensionsWithAccounts?.length
    ? extensionsWithAccounts.find(
        (ext) => ext.extension.name === selectedExtensionIdent
      ) || extensionsWithAccounts[0]
    : undefined;
  const jsonAccounts = {
    accounts: extWithAccounts?.accounts || [],
    injectedSigner: extWithAccounts?.extension.signer || undefined,
  };

  useEffect(() => {
    setError(errExtension);
  }, [errExtension]);

  useEffect(() => {
    if (!extensionsWithAccounts.length) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const net = network || getNetworkFallback();
    setInitNetwork(net);

    const extWithAccounts =
      extensionsWithAccounts.find(
        (ext) => ext.extension.name === selectedExtensionIdent
      ) || extensionsWithAccounts[0];

    if (extWithAccounts?.accounts.length < 1) {
      setError({
        code: 2,
        message:
          "App requires at least one account in browser extension. Please create or import account/s and refresh the page.",
      });
    } else {
      setError(undefined);
    }

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const jsonAccounts = {
      accounts: extWithAccounts.accounts,
      injectedSigner: extWithAccounts.extension.signer,
    };
    reefState.initReefState({
      network: net,
      jsonAccounts,
      ipfsHashResolverFn,
      reefscanEventsConfig,
    });
    // reefState.setSelectedExtension(extWithAccounts.extension.name);
  }, [extensionsWithAccounts, selectedExtensionIdent]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isProviderLoading = useObservableState(
    reefState.providerConnState$.pipe(map((v) => !(v as any).isConnected)),
    false
  );

  useEffect(() => {
    setLoading(loadingExtension || isProviderLoading || isSignersLoading);
  }, [isProviderLoading, loadingExtension, isSignersLoading]);

  const allReefAccounts = useObservableState(reefState.accounts$);

  useAsyncEffect(async () => {
    if (allReefAccounts && provider) {
      const extensionAccounts = [
        reefAccountToReefSigner(allReefAccounts, jsonAccounts.injectedSigner!),
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
      setAllAccounts(allAccs);

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
    }
  }, [allReefAccounts, provider, selectedAddress, initNetwork]);

  return {
    error,
    loading,
    provider,
    network: selectedNetwork as Network,
    signers: allAccounts as ReefSigner[],
    selectedReefSigner,
    reefState,
    extensions: extensionsWithAccounts.map((ext) => ext.extension),
  };
};
