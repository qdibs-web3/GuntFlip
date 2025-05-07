// src/context/WalletProvider.js
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  useGlobalWalletSignerAccount,
  useLoginWithAbstract,
} from "@abstract-foundation/agw-react";

const WalletContext = createContext({
  walletAddress: null,
  connect: async () => {},
  disconnect: () => {},
  isLoading: false, // General loading for account data from the hook
  isConnecting: false, // Specific to the connect action itself
  error: null,
  account: null,
});

export const WalletProvider = ({ children }) => {
  // Log initial hook states
  const accountHookResult = useGlobalWalletSignerAccount();
  const loginHookResult = useLoginWithAbstract();

  console.log("[WalletProvider] Initial useGlobalWalletSignerAccount result:", accountHookResult);
  console.log("[WalletProvider] Initial useLoginWithAbstract result:", loginHookResult);

  const { data: accountData, isLoading: rawIsAccountLoading, error: rawAccountError, refetch: refetchAccount } = accountHookResult;
  const { login: abstractLogin, isLoading: rawIsLoginLoading, error: rawLoginError } = loginHookResult;

  // Ensure loading states are booleans
  const isAccountLoading = typeof rawIsAccountLoading === "boolean" ? rawIsAccountLoading : false;
  const isLoginLoading = typeof rawIsLoginLoading === "boolean" ? rawIsLoginLoading : false;

  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnectingState, setIsConnectingState] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    console.log("[WalletProvider] useEffect for accountData triggered. Current accountData:", accountData);
    if (accountData?.address) {
      setWalletAddress(accountData.address);
      console.log("[WalletProvider] Wallet address SET from accountData:", accountData.address);
    } else {
      setWalletAddress(null);
      console.log("[WalletProvider] Wallet address set to NULL (no accountData.address or accountData is null).");
    }
  }, [accountData]);

  const connect = useCallback(async () => {
    console.log("[WalletProvider] connect function CALLED.");
    console.log("[WalletProvider] Before connect - current accountData:", accountHookResult.data);
    console.log("[WalletProvider] Before connect - current isAccountLoading:", accountHookResult.isLoading);

    if (isConnectingState || isLoginLoading || isAccountLoading) {
      console.warn("[WalletProvider] Connection attempt while already connecting or loading account.");
      return;
    }
    setIsConnectingState(true);
    setActionError(null);
    try {
      console.log("[WalletProvider] Calling abstractLogin...");
      await abstractLogin();
      console.log("[WalletProvider] abstractLogin COMPLETED.");
      
      // Log account data immediately after login attempt to see if the hook has updated yet
      console.log("[WalletProvider] IMMEDIATELY after abstractLogin - current accountData:", accountHookResult.data);
      console.log("[WalletProvider] IMMEDIATELY after abstractLogin - current isAccountLoading:", accountHookResult.isLoading);

      // The useEffect for accountData should handle setting the walletAddress if accountData updates.
      // No need to manually refetch if the hook is designed to be reactive.

    } catch (err) {
      console.error("[WalletProvider] Error during abstractLogin call:", err);
      setActionError(err);
    } finally {
      setIsConnectingState(false);
      console.log("[WalletProvider] connect function FINISHED.");
    }
  }, [abstractLogin, isConnectingState, isLoginLoading, isAccountLoading, accountHookResult]); // Added accountHookResult to deps for logging

  const disconnect = useCallback(() => {
    console.log("[WalletProvider] disconnect function called (Placeholder - no SDK logout implemented yet).");
    // Placeholder - actual disconnect logic depends on Abstract SDK capabilities
    setWalletAddress(null);
    setActionError(null);
    if (typeof refetchAccount === "function") {
        refetchAccount(); // This might help clear the SDK state if it reacts to refetch after its own session is gone
    }
    console.warn("[WalletProvider] Disconnect logic is a placeholder. True SDK disconnect needed for full effect.");
  }, [refetchAccount]);

  const combinedLoading = isAccountLoading || isLoginLoading;
  const combinedError = rawAccountError || rawLoginError || actionError;

  useEffect(() => {
    if (combinedError) {
      console.error("[WalletProvider] Combined Error State:", combinedError);
    }
    // console.log(`[WalletProvider] Current States: walletAddress: ${walletAddress}, combinedLoading: ${combinedLoading}, isConnectingState: ${isConnectingState}, combinedError: ${combinedError ? JSON.stringify(combinedError) : null}`);
  }, [walletAddress, combinedLoading, isConnectingState, combinedError]);

  return (
    <WalletContext.Provider value={{
      walletAddress,
      connect,
      disconnect,
      isLoading: combinedLoading,
      isConnecting: isConnectingState,
      error: combinedError,
      account: accountData,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);

