import { useState } from "react";
import { extension as extReef } from "@reef-chain/util-lib";
import { useAsyncEffect } from "./useAsyncEffect";

export interface ExtensionWithAccounts {
  extension: extReef.InjectedExtension;
  accounts: extReef.InjectedAccountWithMeta[];
}

export const useInjectExtension = (
  appDisplayName: string,
  extensionIdent: string | undefined
): [
  ExtensionWithAccounts | undefined,
  boolean,
  { code?: number; message: string; url?: string } | undefined
] => {
  const [extensionVal, setExtensionVal] = useState<ExtensionWithAccounts>();
  const [isReefInjected, setIsReefInjected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] =
    useState<{ message: string; code?: number; url?: string }>();
  let extensions: extReef.InjectedExtension[];

  document.addEventListener("reef-injected", async () => {
    if (!isReefInjected) setIsReefInjected(true);
  });
  useAsyncEffect(async () => {
    if (!extensionIdent) return;

    try {
      setError(undefined);
      setIsLoading(true);
      const tryConnectSnap = extensionIdent === extReef.REEF_SNAP_IDENT;
      extensions = await extReef.web3Enable(appDisplayName, undefined, tryConnectSnap);

      const extension = extensions.find((ext) => ext.name === extensionIdent);
      if (!extension) {
        setError({
          code: 1,
          message: "Wallet not found.",
        });
        setIsLoading(false);
        setExtensionVal(undefined);
        return;
      }

      const accounts = await extension.accounts.get();
      const accountsWithMeta = accounts.map(
        (acc) =>
          ({
            address: acc.address,
            meta: {
              genesisHash: acc.genesisHash,
              name: acc.name && acc.name.length>0?acc.name:extension.name,
              source: extension.name,
            },
            type: acc.type,
          } as extReef.InjectedAccountWithMeta)
      );

      setExtensionVal({ extension, accounts: accountsWithMeta });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("Error when loading signers!", e);
      setError({
        code: 2,
        message: e
      });
      setExtensionVal(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [isReefInjected, extensionIdent]);

  return [extensionVal, isLoading, error];
};
