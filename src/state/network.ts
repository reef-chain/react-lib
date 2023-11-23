import { network } from '@reef-chain/util-lib';
import {Bond, Network as UtilLibNetwork} from "@reef-chain/util-lib/dist/network"

const networks = Object.keys(network.AVAILABLE_NETWORKS);
export type AvailableNetworks = typeof networks[number];

export interface Network extends UtilLibNetwork{
  factoryAddress:string;
  routerAddress:string;
  graphqlDexsUrl:string;
  bonds:Bond[];
}
