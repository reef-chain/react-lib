import { network } from '@reef-chain/util-lib';

const networks = Object.keys(network.AVAILABLE_NETWORKS);
export type AvailableNetworks = typeof networks[number];

type Bond = typeof network.Bond;

export interface Network {
  rpcUrl: string;
  reefscanUrl: string;
  verificationApiUrl: string;
  factoryAddress: string;
  routerAddress: string;
  name: AvailableNetworks;
  graphqlExplorerUrl: string;
  graphqlDexsUrl: string;
  genesisHash: string;
  bonds: Bond[]
}

export type Networks = Record<AvailableNetworks, Network>;
export const availableNetworks: Networks = {
  testnet: {
    name: network.AVAILABLE_NETWORKS.testnet.name,
    rpcUrl: network.AVAILABLE_NETWORKS.testnet.rpcUrl,
    reefscanUrl: network.AVAILABLE_NETWORKS.testnet.reefscanUrl,
    verificationApiUrl: network.AVAILABLE_NETWORKS.testnet.verificationApiUrl,
    factoryAddress: network.getReefswapNetworkConfig(network.AVAILABLE_NETWORKS.testnet).factoryAddress,
    routerAddress: network.getReefswapNetworkConfig(network.AVAILABLE_NETWORKS.testnet).routerAddress,
    graphqlExplorerUrl: network.AVAILABLE_NETWORKS.testnet.graphqlExplorerUrl,
    graphqlDexsUrl: network.getReefswapNetworkConfig(network.AVAILABLE_NETWORKS.testnet).graphqlDexsUrl,
    genesisHash: network.AVAILABLE_NETWORKS.testnet.genesisHash,
    bonds: network.bonds.testnet,
  },
  mainnet: {
    name: network.AVAILABLE_NETWORKS.mainnet.name,
    rpcUrl: network.AVAILABLE_NETWORKS.mainnet.rpcUrl,
    reefscanUrl: network.AVAILABLE_NETWORKS.mainnet.reefscanUrl,
    verificationApiUrl: network.AVAILABLE_NETWORKS.mainnet.verificationApiUrl,
    factoryAddress: network.getReefswapNetworkConfig(network.AVAILABLE_NETWORKS.mainnet).factoryAddress,
    routerAddress: network.getReefswapNetworkConfig(network.AVAILABLE_NETWORKS.mainnet).routerAddress,
    graphqlExplorerUrl: network.AVAILABLE_NETWORKS.mainnet.graphqlExplorerUrl,
    graphqlDexsUrl: network.getReefswapNetworkConfig(network.AVAILABLE_NETWORKS.mainnet).graphqlDexsUrl,
    genesisHash: network.AVAILABLE_NETWORKS.mainnet.genesisHash,
    bonds: network.bonds.testnet.mainnet,
  },
  localhost: {
    name: network.AVAILABLE_NETWORKS.localhost.name,
    rpcUrl: network.AVAILABLE_NETWORKS.localhost.rpcUrl,
    reefscanUrl: network.AVAILABLE_NETWORKS.localhost.reefscanUrl,
    verificationApiUrl: network.AVAILABLE_NETWORKS.localhost.verificationApiUrl,
    factoryAddress: '',
    routerAddress: '',
    graphqlExplorerUrl: network.AVAILABLE_NETWORKS.localhost.graphqlExplorerUrl,
    graphqlDexsUrl: network.getReefswapNetworkConfig(network.AVAILABLE_NETWORKS.localhost).graphqlDexsUrl,
    genesisHash: network.AVAILABLE_NETWORKS.localhost.genesisHash,
    bonds: network.bonds.testnet.localhost,
  },
};
