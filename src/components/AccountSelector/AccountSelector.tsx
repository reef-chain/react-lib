import React, { useState, useMemo, useEffect } from "react";
import Uik from "@reef-chain/ui-kit";
import "./AccountSelector.css";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Account,
  AccountCreationData,
  Extension,
} from "@reef-chain/ui-kit/dist/ui-kit/components/organisms/AccountSelector/AccountSelector";
import { ReefSigner } from "../../state";
import { toReefBalanceDisplay, trim } from "../../utils";
import MetaMaskIcon from "./MetaMaskIcon";
import { extension as reefExt } from "@reef-chain/util-lib";

export type Network = "mainnet" | "testnet";
export type Language = "en" | "hi";

const availableExtensions: Extension[] = [
  {
    name: reefExt.REEF_EXTENSION_IDENT,
    displayName: "Browser extension",
    link: "https://chrome.google.com/webstore/detail/reefjs-extension/mjgkpalnahacmhkikiommfiomhjipgjn",
    selected: false,
    installed: false,
    icon: <Uik.ReefIcon />,
  },
  {
    name: reefExt.REEF_SNAP_IDENT,
    displayName: "MetaMask Snap",
    link: reefExt.SNAP_ID,
    selected: false,
    installed: false,
    icon: <MetaMaskIcon />,
    isSnap: true,
  },
  // {
  //   name: reefExt.REEF_EASY_WALLET_IDENT,
  //   displayName: "Easy wallet",
  //   link: "local:http://localhost:8080",
  //   selected: false,
  //   installed: false,
  //   icon: <Uik.ReefSign />,
  // },
];

interface AccountSelector {
  injectedExtensions?: reefExt.InjectedExtension[];
  selExtName?: string;
  selectExtension?: (name: string) => void;
  accounts: ReefSigner[];
  selectedSigner?: ReefSigner;
  selectAccount: (index: number, signer: ReefSigner) => void;
  selectedNetwork?: Network;
  onNetworkSelect?: (network: Network) => any;
  onLanguageSelect?: (language: Language) => any;
  isBalanceHidden?: boolean;
  showBalance?: (...args: any[]) => any;
  availableNetworks: Network[];
  showSnapOptions?: boolean;
  onRename?: (address: string, newName: string) => any;
  onExport?: (address: string, password: string) => any;
  onImport?: (...args: any[]) => any;
  onForget?: (address: string) => any;
  onUpdateMetadata?: (network: Network) => any;
  onStartAccountCreation?: () => Promise<AccountCreationData>;
  onConfirmAccountCreation?: (seed: string, name: string) => any;
}

export const AccountSelector = ({
  selectedSigner,
  injectedExtensions,
  selExtName,
  selectExtension,
  accounts,
  selectAccount,
  selectedNetwork,
  onNetworkSelect,
  onLanguageSelect,
  isBalanceHidden,
  showBalance,
  availableNetworks,
  showSnapOptions,
  onRename,
  onExport,
  onImport,
  onForget,
  onUpdateMetadata,
  onStartAccountCreation,
  onConfirmAccountCreation,
}: AccountSelector): JSX.Element => {
  const name = selectedSigner ? selectedSigner.name : "";
  const balance = toReefBalanceDisplay(selectedSigner?.balance);

  const [isOpen, setOpen] = useState(false);
  const [extensions, setExtensions] = useState(availableExtensions);

  useEffect(() => {
    const updatedExtensions = extensions.map((extension: Extension) => ({
      ...extension,
      installed: !!injectedExtensions?.find(
        (ext) => ext.name === extension.name
      ),
    }));
    setExtensions(updatedExtensions);
  }, [injectedExtensions]);

  const getAccounts = useMemo(() => {
    const allAccounts: Account[] = [];
    accounts.map(async (acc) => {
      const { name, address, evmAddress, source } = acc;
      const isEvmClaimed = await acc.signer.isClaimed();
      allAccounts.push({
        name,
        address,
        evmAddress,
        source,
        isEvmClaimed,
      } as Account);
    });
    return allAccounts;
  }, [accounts]);

  const selectedAccount = useMemo(() => {
    if (!selectedSigner?.address) return null;

    return {
      name: selectedSigner.name,
      address: selectedSigner.address,
      evmAddress: selectedSigner.evmAddress,
    };
  }, [selectedSigner]);

  const onSelect = (account): void => {
    const acc = accounts.find(
      (acc: ReefSigner) => acc.address === account.address
    );
    if (!acc) return;

    const index = accounts.indexOf(acc);
    selectAccount(index, acc);
    setOpen(false);
  };

  return (
    <div className="account-selector-box--nav">
      <div
        className={`${
          !balance.startsWith("-") ? "nav-account border-rad" : ""
        } `}
      >
        {!balance.startsWith("-") ? (
          <div className="my-auto mx-2 fs-6">
            {isBalanceHidden ? (
              <button
                type="button"
                aria-label="Hidden balance button"
                className="nav-account__hidden-balance"
                onClick={showBalance}
              >
                <div />
                <div />
                <div />
                <div />
                <div />
              </button>
            ) : (
              <span className="nav-account__balance">{balance}</span>
            )}
          </div>
        ) : (
          <div />
        )}

        {selectedSigner && (
          <button
            type="button"
            className="nav-account__account"
            onClick={() => setOpen(true)}
          >
            <span>{trim(name)}</span>
          </button>
        )}

        <Uik.AccountSelector
          isOpen={isOpen}
          onClose={() => setOpen(false)}
          availableExtensions={extensions}
          selExtName={selExtName}
          onExtensionSelect={selectExtension}
          accounts={getAccounts}
          selectedAccount={selectedAccount}
          onSelect={onSelect}
          selectedNetwork={selectedNetwork}
          onNetworkSelect={onNetworkSelect}
          onLanguageSelect={onLanguageSelect}
          availableNetworks={availableNetworks}
          showSnapOptions={showSnapOptions}
          onRename={onRename}
          onExport={onExport}
          onImport={onImport}
          onForget={onForget}
          onUpdateMetadata={onUpdateMetadata}
          onStartAccountCreation={onStartAccountCreation}
          onConfirmAccountCreation={onConfirmAccountCreation}
        />
      </div>
      <button
        type="button"
        aria-label="Open button"
        className="nav-account__gear"
        onClick={() => setOpen(true)}
      >
        <FontAwesomeIcon icon={faGear} />
      </button>
    </div>
  );
};
