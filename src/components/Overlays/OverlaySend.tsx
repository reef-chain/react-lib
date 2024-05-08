
import React from 'react';
import { Send } from '../Transfer';
import { OverlayAction } from '../OverlayAction';
import './overlay.css';
import { Notify, ReefSigner, Token } from '../../state';
import { Provider } from '@reef-chain/evm-provider';

interface OverlaySend {
  tokenAddress?: string;
  isOpen: boolean;
  onClose?: () => void;
  tokens:Token[];
  selectedSigner:ReefSigner|undefined;
  provider:Provider|undefined;
  accounts:ReefSigner[]|undefined;
  notify:(message: string, type?: Notify) => void;
  isDarkMode?:boolean;
}

export const OverlaySend:React.FC<OverlaySend> = ({
  tokenAddress,
  isOpen,
  onClose,
  tokens,
  selectedSigner,
  provider,
  accounts,
  notify,
  isDarkMode
}: OverlaySend): JSX.Element => {
  return (
    <OverlayAction
      isOpen={isOpen}
      title="Send"
      onClose={onClose}
      className="overlay-swap"
      isDarkMode={isDarkMode}
    >
      <div className="uik-pool-actions pool-actions">
        { provider && selectedSigner
          && (
          <Send
            accounts={accounts || []}
            notify={notify}
            provider={provider}
            signer={selectedSigner}
            tokens={tokens}
            tokenAddress={tokenAddress}
          />
          )}
      </div>
    </OverlayAction>
  );
};
