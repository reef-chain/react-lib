import React from 'react';
import { BigNumber } from 'ethers';
import "./NFTCard.css";

interface NFTData {
  iconUrl: string;
  name: string;
  balance: BigNumber;
  mimetype?: string;
}

export const NFTCard: React.FC<NFTData> = ({
  iconUrl, name, balance, mimetype
}): JSX.Element => {
  const loading = false;
  return (
    <div className="nfts__item">
      {mimetype && mimetype.indexOf('mp4') > -1
        && (
          <video className="nfts__item-video" autoPlay loop muted poster="">
            <source src={iconUrl} type="video/mp4" />
          </video>
        )}
      {(!mimetype || !(mimetype?.indexOf('mp4') > -1)) && (
        <div
          className={`
            nfts__item-image
            ${loading ? 'nfts__item-image--loading' : ''}
          `}
          style={
            iconUrl && !loading
              ? { backgroundImage: `url(${iconUrl})` } : {}
          }
        />
      )}
      <div className="nfts__item-info">
        <div className="nfts__item-name">{name}</div>
        <div className="nfts__item-balance">{balance.toString()}</div>
      </div>
    </div>
  );
};
