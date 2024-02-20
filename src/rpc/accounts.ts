import type {
  InjectedAccountWithMeta, InjectedExtension,
} from '@polkadot/extension-inject/types';
import { Provider, Signer } from '@reef-chain/evm-provider';
import { DeriveBalancesAccountData } from '@polkadot/api-derive/balances/types';
import type { Signer as InjectedSigner } from '@polkadot/api/types';
import { extension as extReef } from '@reef-chain/util-lib';
import { BigNumber } from 'ethers';
import { ReefSigner } from '../state/types';
import { ensure, removeUndefinedItem } from '../utils/utils';

const accountSourceSigners = new Map<string, InjectedSigner>();
const getAccountInjectedSigner = async (
  source: string,
): Promise<InjectedSigner | undefined> => {
  if (!accountSourceSigners.has(source)) {
    const signer = await extReef.web3FromSource(source)
      .then((injected) => injected?.signer)
      .catch((err) => console.error('getAccountSigner error =', err));
    if (signer) {
      accountSourceSigners.set(source, signer);
    }
  }
  return accountSourceSigners.get(source);
};

export const getAccountSigner = async (
  address: string,
  source: string,
  provider: Provider,
  injSigner?: InjectedSigner,
): Promise<Signer | undefined> => {
  const iSigner = injSigner || (await getAccountInjectedSigner(source));
  return iSigner ? new Signer(provider, address, iSigner) : undefined;
};

export const getReefCoinBalance = async (
  address: string,
  provider: Provider,
): Promise<BigNumber> => {
  const balance = await provider.api.derive.balances
    .all(address as any)
    .then((res: DeriveBalancesAccountData) => BigNumber.from(res.freeBalance.toString(10)));
  return balance;
};

interface SignerInfo {
  name: string;
  source: string;
  address: string;
  genesisHash: string;
}

const signerToReefSigner = async (
  signer: Signer,
  provider: Provider,
  {
    address, name, source, genesisHash,
  }: SignerInfo,
): Promise<ReefSigner> => {
  const evmAddress = await signer.getAddress();
  const isEvmClaimed = await signer.isClaimed();
  let inj;
  try {
    inj = await extReef.web3FromAddress(address);
  } catch (e) {
    // when web3Enable() is not called before
  }
  const balance = await getReefCoinBalance(address, provider);
  return {
    signer,
    balance,
    evmAddress,
    isEvmClaimed,
    name,
    address,
    source,
    genesisHash: genesisHash!,
    sign: inj?.signer,
  };
};

export const metaAccountToSigner = async (
  account: InjectedAccountWithMeta | extReef.InjectedAccountWithMeta,
  provider: Provider,
  injSigner: InjectedSigner,
): Promise<ReefSigner | undefined> => {
  const { source } = account.meta;
  const signer = await getAccountSigner(
    account.address,
    source,
    provider,
    injSigner,
  );
  if (!signer) {
    return undefined;
  }
  return signerToReefSigner(
    signer,
    provider,
    {
      source,
      address: account.address,
      name: account.meta.name || '',
      genesisHash: account.meta.genesisHash || '',
    },
  );
};

export const metaAccountsToSigners = async (
  accounts: (InjectedAccountWithMeta | extReef.InjectedAccountWithMeta)[],
  provider: Provider,
  sign: InjectedSigner,
): Promise<ReefSigner[]> => {
  const signers = await Promise.all(
    accounts
      .filter((account) => provider.api.genesisHash.toString() === account.meta.genesisHash)
      .map((account) => metaAccountToSigner(account, provider, sign)),
  );

  return signers.filter(removeUndefinedItem) as ReefSigner[];
};

export const accountToSigner = async (
  account: extReef.InjectedAccount,
  provider: Provider,
  sign: InjectedSigner,
  source: string,
): Promise<ReefSigner> => {
  const signer = new Signer(provider, account.address, sign);
  return signerToReefSigner(
    signer,
    provider,
    {
      source,
      address: account.address,
      name: account.name || '',
      genesisHash: account.genesisHash || '',
    },
  );
};

export function accountJsonToMeta(acc: extReef.AccountJson, source = ''): InjectedAccountWithMeta {
  return {
    address: acc.address,
    meta: {
      genesisHash: acc.genesisHash,
      name: acc.name,
      source,
    },
  };
}

export const getExtensionSigners = async (
  extensions: InjectedExtension[] | extReef.InjectedExtension[],
  provider: Provider,
): Promise<ReefSigner[]> => {
  const extensionAccounts = await Promise.all(
    extensions.map(async (extension) => ({
      name: extension.name,
      sig: extension.signer,
      accounts: await extension.accounts.get(),
    })),
  );
  const accountPromisses = extensionAccounts.flatMap(
    ({ accounts, name, sig }) => accounts.map((account) => accountToSigner(account, provider, sig, name)),
  );
  const accounts = await Promise.all(accountPromisses);
  return accounts as ReefSigner[];
};

export const bindSigner = async (signer: Signer): Promise<void> => {
  const hasEvmAddress = await signer.isClaimed();
  ensure(!hasEvmAddress, 'Account already has EVM address!');
  await signer.claimDefaultAccount();
};

export const getSignerIdent = (signer: ReefSigner): string => `${signer.source}_${signer.address}`;
