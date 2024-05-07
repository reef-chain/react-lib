import React from "react";
import Uik from "@reef-chain/ui-kit";
import { Extension } from "@reef-chain/ui-kit/dist/ui-kit/components/organisms/AccountSelector/AccountSelector";
import { extension as reefExt } from "@reef-chain/util-lib";

import { MetaMaskLogo } from "../common/Logos/MetaMaskLogo";
import { WalletConnectLogo } from "../common/Logos/WalletConnectLogo";
import "./WalletSelector.css";

export const walletSelectorOptions: Record<string, Extension> = {
    [reefExt.REEF_EXTENSION_IDENT]: {
        name: reefExt.REEF_EXTENSION_IDENT,
        displayName: "Browser extension",
        link: "https://chrome.google.com/webstore/detail/reefjs-extension/mjgkpalnahacmhkikiommfiomhjipgjn",
        selected: false,
        installed: false,
        icon: <Uik.ReefIcon />,
        chromeExtensionLink: "https://chrome.google.com/webstore/detail/reefjs-extension/mjgkpalnahacmhkikiommfiomhjipgjn",
        // firefoxExtensionLink: "TODO",
    },
    [reefExt.REEF_SNAP_IDENT]: {
        name: reefExt.REEF_SNAP_IDENT,
        displayName: "MetaMask Snap",
        link: "https://app.reef.io/snap",
        selected: false,
        installed: false,
        icon: <MetaMaskLogo />,
        isSnap: true,
    },
    [reefExt.REEF_EASY_WALLET_IDENT]: {
        name: reefExt.REEF_EASY_WALLET_IDENT,
        displayName: "Easy wallet",
        link: "http://localhost:8080", // TODO
        selected: false,
        installed: false,
        icon: <Uik.ReefSign />,
        // chromeExtensionLink: "TODO",
        // firefoxExtensionLink: "TODO",
    },
    [reefExt.REEF_WALLET_CONNECT_IDENT]: {
        name: reefExt.REEF_WALLET_CONNECT_IDENT,
        displayName: "Mobile App",
        link: "http://localhost:8080", // TODO
        selected: false,
        installed: false,
        icon: <WalletConnectLogo />
    },
};

interface WalletSelector_ {
    title?: string;
    availableExtensions?: Extension[];
    onExtensionSelect: (extensionIndent: string) => void;
    onCloseClick?: () => void;
}

export const WalletSelector = ({
    title = 'Select wallet',
    availableExtensions,
    onExtensionSelect,
    onCloseClick
}: WalletSelector_): JSX.Element => {
    const options = availableExtensions || Object.values(walletSelectorOptions);

    return (
        <Uik.Modal
            title={title}
            isOpen={true}
            onClose={onCloseClick}
        >
            <div className="overflow-scroll">
                {options.map((option) => (
                    <button
                        type="button"
                        className="btn w-100"
                        onClick={() => onExtensionSelect(option.name)}
                        key={option.name}
                    >
                        <div className="d-flex align-items-center wallet-item">
                            <span className="me-2">{option.displayName}</span>
                            {option.icon}
                        </div>
                    </button>
                ))}
            </div>
        </Uik.Modal>
    );
}