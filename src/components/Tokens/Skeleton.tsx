import React from 'react';
import "./index.css"

interface Skeleton{
    isDarkMode?:boolean;
}

export const Skeleton:React.FC<Skeleton> = ({isDarkMode=false}): JSX.Element => (
    <div className={`token-card token-card--skeleton${isDarkMode?'-dark':''}`}>
      <div className={`token-card__wrapper ${isDarkMode?'token-card__wrapper-dark':''}`}>
        <div className="token-card__main">
          <div className="token-card__image loading-animation" />
          <div className="token-card__info">
            <div className="token-card__token-info">
              <span className="token-card__token-name loading-animation" />
            </div>
            <div className="token-card__token-price loading-animation" />
          </div>
        </div>
      </div>
    </div>
  );