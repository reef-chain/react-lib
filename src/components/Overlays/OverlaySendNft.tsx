import Identicon from '@polkadot/react-identicon';
import React, {useEffect, useMemo, useState} from 'react';
import './overlay.css';
import Uik from '@reef-chain/ui-kit';
import { Contract, ethers } from 'ethers';
import { isSubstrateAddress, resolveEvmAddress } from '@reef-chain/evm-provider/utils';
import { Provider, Signer } from '@reef-chain/evm-provider';
import { shortAddress } from '../../utils';
import { OverlayAction } from '../OverlayAction';
import { ReefSigner } from '../../state';

interface OverlaySendNFT {
  nftName?: string;
  isOpen: boolean;
  onClose: () => void;
  balance: string;
  address: string;
  nftId: string;
  iconUrl?: string;
  isVideoNFT?:boolean;
  accounts:any;
  selectedSigner:any;
  provider:any; 
  isDarkMode?:boolean;
}

const nftTxAbi = [
  {
    name: 'safeTransferFrom',
    type: 'function',
    inputs: [
      {
        name: 'from',
        type: 'address',
      },
      {
        name: 'to',
        type: 'address',
      },
      {
        name: 'id',
        type: 'uint256',
      },
      {
        name: 'amount',
        type: 'uint256',
      },
      {
        name: 'data',
        type: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
];

const getResolvedEVMAddress = (provider:Provider, address:string): Promise<string> => {
  if (isSubstrateAddress(address)) {
    return resolveEvmAddress(provider, address);
  }
  return Promise.resolve(address);
};

const Accounts = ({
  accounts,
  selectAccount,
  isOpen,
  onClose,
  query,
  selectedAccount,
}: {
  accounts: ReefSigner[];
  selectAccount: (index: number, signer: ReefSigner) => void;
  isOpen: boolean;
  onClose: () => void;
  query: string;
  selectedAccount: ReefSigner;
}): JSX.Element => {
  const availableAccounts = useMemo(() => {
    const list = accounts.filter(({ address }) => selectedAccount.address !== address);

    if (!query) return list;

    const perfectMatch = list.find((acc) => acc.address === query);
    if (perfectMatch) {
      return [
        perfectMatch,
        ...list.filter((acc) => acc.address !== query),
      ];
    }

    return list.filter((acc) => acc.address.toLowerCase().startsWith(query.toLowerCase())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
        || (acc.name as any).replaceAll(' ', '').toLowerCase().startsWith(query.toLowerCase()));
  }, [accounts, query]);

  return (
    <div className="send-accounts">
      {
        availableAccounts?.length > 0
          && (
            <Uik.Dropdown
              isOpen={isOpen}
              onClose={onClose}
            >
              {
                availableAccounts.map((account, index) => (
                  <Uik.DropdownItem
                  // eslint-disable-next-line
                    key={`account-${index}`}
                    className={`
                      send-accounts__account
                      ${account.address === query ? 'send-accounts__account--selected' : ''}
                    `}
                    onClick={() => selectAccount(index, account)}
                  >
                    <Identicon className="send-accounts__account-identicon" value={account.address} size={44} theme="substrate" />
                    <div className="send-accounts__account-info">
                      <div className="send-accounts__account-name">{ account.name }</div>
                      <div className="send-accounts__account-address">{ shortAddress(account.address) }</div>
                    </div>
                  </Uik.DropdownItem>
                ))
              }
            </Uik.Dropdown>
          )
      }
    </div>
  );
};

export const OverlaySendNFT = ({
  nftName,
  isOpen,
  onClose,
  balance,
  isVideoNFT,
  iconUrl,
  address,
  nftId,
  accounts,
  selectedSigner,
  provider,
  isDarkMode
}: OverlaySendNFT): JSX.Element => {
  const [isAccountListOpen, setAccountsListOpen] = useState(false);
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [percentage, setPercentage] = useState<number>(100);
  const [btnLabel, setBtnLabel] = useState<string>('Enter destination address');
  // const accounts = hooks.useObservableState(appState.accountsSubj);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [isAmountEnabled, setIsAmountEnabled] = useState<boolean>(false);
  const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
  const [showPercentages, setShowPercentages] = useState<boolean>(true);
  const [parsedBalance, setParsedBalance] = useState<number>(parseInt(balance, 10));

  // const selectedSigner = hooks.useObservableState(appState.selectedSigner$);
  // const provider = hooks.useObservableState(appState.currentProvider$);

  const clearStates = ():void => {
    setDestinationAddress('');
    setAmount(0);
    setIsFormValid(false);
    setIsAmountEnabled(false);
    setTransactionInProgress(false);
  };

  const transferNFT = async (from: string, to: string, _amount: number, nftContract: string, _signer: Signer, _provider: Provider, _nftId: string): Promise<void> => {
    if (!isFormValid || transactionInProgress) {
      return;
    }

    setTransactionInProgress(true);
    const contractInstance = new Contract(nftContract, nftTxAbi, _signer);
    const toAddress = await getResolvedEVMAddress(_provider, to);
    try {
      await contractInstance.safeTransferFrom(from, toAddress, _nftId, _amount, [], {
        customData: {
          storageLimit: 2000,
        },
      });
      Uik.notify.success('Transaction Successful!');
      clearStates();
      onClose();
      /* eslint-disable @typescript-eslint/no-explicit-any */
    } catch (error: any) {
      if (!toAddress) {
        Uik.notify.danger('Transaction can not be made because destination address does not have EVM address connected.');
      } else if (error?.message === '_canceled') {
        Uik.notify.danger('Transaction cancelled by user');
      } else {
        Uik.notify.danger('Unknown error occurred, please try again');
      }
    } finally {
      setTransactionInProgress(false);
    }
  };

  const calculateAndSetPercentage = (val: number): void => {
    const closestToVal = Math.ceil((val * parsedBalance) / 100);
    setAmount(closestToVal);
    setPercentage(closestToVal * 100 / parsedBalance);
  };

  const createSliderConfig = (): { position: number, text?: string }[] => {
    if (parsedBalance <= 1) {
      return [];
    }

    if (showPercentages) {
      return [
        { position: 0, text: '0%' },
        { position: 25 },
        { position: 50, text: '50%' },
        { position: 75 },
        { position: 100, text: '100%' },
      ];
    }

    const step = 25;
    const helpers = [];

    for (let i = 0; i < 5; i += 1) {
      const position = Math.ceil(step * i);
      const positionText = Math.ceil(parsedBalance * (step / 100) * i).toString();
      const text = (i % 2 === 0 || position === parsedBalance) ? positionText : '';
      //@ts-ignore
      helpers.push({ position, text });
    }
    return helpers;
  };

  const sliderConfig = useMemo(() => createSliderConfig(), [showPercentages]);

  const getSliderTooltipValue = (value = 0): string => (
    showPercentages ? `${Uik.utils.maxDecimals(value, 2)}%` : Math.ceil(value / 100 * parsedBalance).toString()
  );

  useEffect(() => {
    setParsedBalance(parseInt(balance, 10) ?? 0);
  }, [balance]);

  useEffect(() => {
    const initAmount = parsedBalance !== 0 ? 1 : 0;
    setAmount(initAmount);
    setPercentage(parseInt(initAmount.toString(), 10) * 100 / parsedBalance);
    setIsAmountEnabled(parsedBalance > 1);
    setShowPercentages(parsedBalance > 99);
  }, [parsedBalance]);

  useEffect(() => {
    const validateAmount = (): boolean => amount > 0 && amount <= parsedBalance;
    const validateDestinationAddress = (): boolean => ethers.utils.isAddress(destinationAddress) || isSubstrateAddress(destinationAddress);

    const setAmountError = (): void => {
      if (amount > parsedBalance) {
        setBtnLabel('Amount too high');
      } else if (amount < 1) {
        setBtnLabel('Amount too low');
      }
    };

    const destinationValid = validateDestinationAddress();
    const amountValid = validateAmount();
    setIsFormValid(amountValid && destinationValid);

    if (!destinationValid) {
      setBtnLabel('Address is invalid');
    } else if (!amountValid) {
      setAmountError();
    } else {
      setBtnLabel('Send');
    }
  }, [amount, parsedBalance, destinationAddress]);

  return (
    <OverlayAction
      isOpen={isOpen}
      title="Send NFT"
      onClose={onClose}
      className="overlay-swap"
      isDarkMode={isDarkMode}
    >
      <div className="uik-pool-actions pool-actions">
        <div className="send-nft-view">
          { isVideoNFT
            ? (
              <video
                className="nfts__item-video-small nft-iconurl-small send__address-identicon"
                autoPlay
                loop
                muted
                poster=""
              >
                <source src={iconUrl} type="video/mp4" />
              </video>
            )
            : (
              <img
                src={iconUrl}
                alt=""
                className="nft-iconurl-small send__address-identicon"
              />
            )}
        </div>
        <div className={`send__address ${isDarkMode?'send__address-dark':''}`}>
          <Identicon className="send__address-identicon" value={destinationAddress} size={46} theme="substrate" />
          <input
            className="send__address-input"
            value={destinationAddress}
            maxLength={70}
            onChange={(e) => setDestinationAddress(e.target.value)}
            placeholder={`Send ${nftName} to:`}
            disabled={transactionInProgress}
            onFocus={() => setAccountsListOpen(true)}
          />
          {
          accounts && accounts!.length > 0
          && (
            <Accounts
              isOpen={isAccountListOpen}
              onClose={() => setAccountsListOpen(false)}
              accounts={accounts!}
              query={destinationAddress}
              selectAccount={(_, _signer) => setDestinationAddress(_signer.address)}
              selectedAccount={selectedSigner!}
            />

          )
        }
        </div>
        <div className="send__address">
          <input
            type="number"
            className="send__amount-input"
            value={amount.toString()}
            maxLength={70}
            name="amount"
            onChange={(e) => {
              setAmount(+e.target.value);
              if (parseInt(e.target.value, 10) <= parseInt(balance, 10) && parseInt(e.target.value, 10) >= 0) {
                setPercentage(parseInt(e.target.value, 10) * 100 / parseInt(balance, 10));
              }
            }}
            placeholder={`Send ${amount} ${nftName}`}
            disabled={!isAmountEnabled || transactionInProgress}
          />
        </div>
        {
          parsedBalance > 1 && (
            <div className="uik-pool-actions__slider">
              <Uik.Slider
                className="send__slider"
                value={percentage}
                onChange={calculateAndSetPercentage}
                tooltip={getSliderTooltipValue(percentage)}
                helpers={sliderConfig}
              />
            </div>
          )
        }
        <Uik.Button
          size="large"
          className="uik-pool-actions__cta"
          disabled={!isFormValid}
          loading={transactionInProgress}
          fill={isFormValid && !transactionInProgress}
          onClick={() => transferNFT(selectedSigner?.evmAddress as string, destinationAddress, amount, address, selectedSigner?.signer as Signer, provider, nftId)}
        >
          { !transactionInProgress ? btnLabel : ''}
        </Uik.Button>

      </div>
    </OverlayAction>
  );
};