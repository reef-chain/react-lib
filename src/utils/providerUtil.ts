import { Provider } from '@reef-chain/evm-provider';
import { WsProvider } from '@polkadot/api';

export async function initProvider(providerUrl: string): Promise<Provider> {
  const newProvider = new Provider({
    provider: new WsProvider(providerUrl),
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
