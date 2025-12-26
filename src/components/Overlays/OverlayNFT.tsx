import React, { useState } from 'react';
import './overlay.css';
import Uik from '@reef-chain/ui-kit';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import {OverlaySendNFT} from './OverlaySendNft';
import { shortAddress } from '../../utils';
import { OverlayAction } from '../OverlayAction';
import { IFormoAnalytics } from '@formo/analytics';

interface OverlayNFT {
  nftName?: string;
  isOpen: boolean;
  isVideoNFT?: boolean;
  iconUrl?: string;
  onClose:()=>void;
  balance:string;
  address:string;
  contractType:string;
  nftId:string;
  accounts:any;
  selectedSigner:any;
  provider:any; 
  isDarkMode?:boolean;
  analytics_formo?: IFormoAnalytics;
}

export const OverlayNFT = ({
  nftName,
  isOpen,
  isVideoNFT,
  iconUrl,
  onClose,
  balance,
  address,
  contractType,
  nftId,
  accounts,
  selectedSigner,
  provider,
  isDarkMode,
  analytics_formo,
}: OverlayNFT): JSX.Element => {
  const [sendNFT, setSendNFT] = useState(false);
  const [isNFTLoaded, setIsNFTLoaded] = useState<boolean>(false);

  return (
    <OverlayAction
      isOpen={isOpen}
      title="NFT Details"
      onClose={onClose}
      className="overlay-swap"
      isDarkMode={isDarkMode}
    >
      <div className="uik-pool-actions pool-actions">
        <div className="nft-name--modal">{nftName}</div>
        <div className="nft-view">

          { !isNFTLoaded && <Uik.Loading /> }

          { isVideoNFT ? (
            <video
              className={`nfts__item-video nft-iconurl ${!isNFTLoaded ? 'nft-hidden' : ''}`}
              autoPlay
              loop
              muted
              poster=""
              onLoadedData={() => setIsNFTLoaded(true)}
            >
              <source src={iconUrl} type="video/mp4" />
            </video>
          ) : (
            <img
              src={iconUrl}
              alt=""
              className={`nft-iconurl ${!isNFTLoaded ? 'nft-hidden' : ''}`}
              onLoad={() => setIsNFTLoaded(true)}
            />
          )}
        </div>
        <div className="display-table">
          <div>
            <span className="display-table-label">nft id: </span>
            {nftId}
          </div>
          <div>
            <span className="display-table-label">balance: </span>
            {balance}
          </div>
          <div>
            <span className="display-table-label">address: </span>
            {shortAddress(address)}
          </div>
          <div>
            <span className="display-table-label">contract type: </span>
            {contractType}
          </div>
        </div>
        <div className="nft-box-send-btn">
          <Uik.Button
            className="uik-pool-actions__cta"
            text="Send NFT"
            icon={faPaperPlane}
            onClick={() => {
              setSendNFT(true);
            }}
            size="large"
            fill
          />
        </div>
      </div>
      <OverlaySendNFT
        isOpen={sendNFT}
        onClose={() => setSendNFT(false)}
        nftName={nftName}
        iconUrl={iconUrl}
        isVideoNFT={isVideoNFT}
        balance={balance}
        address={address}
        nftId={nftId}
        accounts={accounts}
        selectedSigner={selectedSigner}
        provider={provider}
        isDarkMode={isDarkMode}
        analytics_formo={analytics_formo}
      />
    </OverlayAction>
  );
};
