import { useState } from "react";
import { extension as extReef } from "@reef-chain/util-lib";
import { useAsyncEffect } from "./useAsyncEffect";

function getBrowserExtensionUrl(): string | undefined {
  const isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
  if (isFirefox) {
    return "https://addons.mozilla.org/en-US/firefox/addon/reef-js-extension/";
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const isChrome = navigator.userAgent.toLowerCase().indexOf("chrome") > -1;
  if (isChrome) {
    return "https://chrome.google.com/webstore/detail/reefjs-extension/mjgkpalnahacmhkikiommfiomhjipgjn";
  }
  return undefined;
}

// TODO: Show options to install snap and easy wallet when they are available
function getInstallExtensionMessage(): { message: string; url?: string } {
  const extensionUrl = getBrowserExtensionUrl();
  const installText = extensionUrl
    ? "Please install Reef chain or some other Solidity browser extension and refresh the page."
    : "Please use Chrome or Firefox browser.";
  return {
    message: `App uses browser extension to get accounts and securely sign transactions. ${installText}`,
    url: extensionUrl,
  };
}

export interface ExtensionWithAccounts {
  extension: extReef.InjectedExtension;
  accounts: extReef.InjectedAccountWithMeta[];
}

export const useInjectExtensions = (
  appDisplayName: string
): [
  ExtensionWithAccounts[],
  boolean,
  { code?: number; message: string; url?: string } | undefined
] => {
  const [extensionsVal, setExtensionsVal] = useState<ExtensionWithAccounts[]>(
    []
  );
  const [isReefInjected, setIsReefInjected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] =
    useState<{ message: string; code?: number; url?: string }>();
  let extensions: extReef.InjectedExtension[];

  document.addEventListener("reef-injected", async () => {
    if (!isReefInjected) setIsReefInjected(true);
  });
  useAsyncEffect(async () => {
    try {
      setError(undefined);
      setIsLoading(true);
      extensions = (await extReef.web3Enable(appDisplayName)).filter((ext) =>
        extReef.ExtensionsIdents.includes(ext.name)
      );
      if (!extensions?.length) {
        const installExtensionMessage = getInstallExtensionMessage();
        setError({
          code: 1,
          ...installExtensionMessage,
        });
        setIsLoading(false);
        return;
      }

      const extensionsWithAccounts: ExtensionWithAccounts[] = await Promise.all(
        extensions.map(async (ext) => {
          const accounts = await ext.accounts.get();
          const accountsWithMeta = accounts.map(
            (acc) =>
              ({
                address: acc.address,
                meta: {
                  genesisHash: acc.genesisHash,
                  name: acc.name,
                  source: ext.name,
                },
                type: acc.type,
              } as extReef.InjectedAccountWithMeta)
          );
          return { extension: ext, accounts: accountsWithMeta };
        })
      );

      setExtensionsVal(extensionsWithAccounts);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("Error when loading signers!", e);
      setError(e as { message: string });
    } finally {
      setIsLoading(false);
    }
  }, [isReefInjected]);

  return [extensionsVal, isLoading, error];
};
