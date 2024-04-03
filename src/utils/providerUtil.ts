import { Provider } from '@reef-chain/evm-provider';
import { WsProvider } from '@polkadot/api';
import type { ProviderInterface } from '@polkadot/rpc-provider/types';

export async function initProvider(providerUrl: string): Promise<Provider> {
  const newProvider = new Provider({
    provider: new WsProvider(providerUrl) as unknown as ProviderInterface,
  });
  try {
    await newProvider.api.isReadyOrError;
  } catch (e) {
    console.log('Provider isReadyOrError ERROR=', e);
    throw e;
  }
  return newProvider;
}

export async function disconnectProvider(provider: Provider): Promise<void> {
  await provider.api.disconnect();
}
