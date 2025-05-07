// src/context/WalletProvider.js
// This version builds upon WalletProvider_rollback.js to integrate the abstractLogout function.
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  useGlobalWalletSignerAccount,
  useLoginWithAbstract,
} from "@abstract-foundation/agw-react";

const WalletContext = createContext({
  walletAddress: null,
  connect: async () => {},
  disconnect: async () => {},
  isLoading: false,
  isConnecting: false,
  error: null,
  account: null,
});

export const WalletProvider = ({ children }) => {
  const accountHookResult = useGlobalWalletSignerAccount();
  // Destructure logout from useLoginWithAbstract, aliasing to abstractLogout for clarity
  const { login: abstractLogin, logout: abstractLogout, isLoading: rawIsLoginLoading, error: rawLoginError } = useLoginWithAbstract();

  console.log("[WalletProvider] Initial useGlobalWalletSignerAccount result:", accountHookResult);
  console.log("[WalletProvider] Initial useLoginWithAbstract result (includes logout):");

  const { data: accountData, isLoading: rawIsAccountLoading, error: rawAccountError, refetch: refetchAccount } = accountHookResult;

  const isAccountLoading = typeof rawIsAccountLoading === "boolean" ? rawIsAccountLoading : false;
  const isLoginLoading = typeof rawIsLoginLoading === "boolean" ? rawIsLoginLoading : false;

  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnectingState, setIsConnectingState] = useState(false);
  const [isDisconnectingState, setIsDisconnectingState] = useState(false); // For disconnect loading
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
      // SDK should update accountData, triggering useEffect
    } catch (err) {
      console.error("[WalletProvider] Error during abstractLogin call:", err);
      setActionError(err);
    } finally {
      setIsConnectingState(false);
      console.log("[WalletProvider] connect function FINISHED.");
    }
  }, [abstractLogin, isConnectingState, isLoginLoading, isAccountLoading]);

  const disconnect = useCallback(async () => {
    console.log("[WalletProvider] disconnect function CALLED.");
    if (typeof abstractLogout !== "function") {
      console.warn("[WalletProvider] abstractLogout function is not available from SDK. Cannot perform clean disconnect.");
      setWalletAddress(null); // Clear local state as a fallback
      setActionError(new Error("SDK logout not available."));
      return;
    }
    setIsDisconnectingState(true);
    setActionError(null);
    try {
      console.log("[WalletProvider] Calling abstractLogout...");
      await abstractLogout();
      console.log("[WalletProvider] abstractLogout COMPLETED.");
      // After a successful SDK logout, accountData from useGlobalWalletSignerAccount should become null/undefined.
      // The useEffect watching accountData will then set walletAddress to null.
      // Optionally, refetch to ensure the hook updates if it doesn't automatically.
      if (typeof refetchAccount === "function") {
        console.log("[WalletProvider] Refetching account data after abstractLogout...");
        await refetchAccount();
      }
    } catch (err) {
      console.error("[WalletProvider] Error during abstractLogout call:", err);
      setActionError(err);
    } finally {
      setIsDisconnectingState(false);
      console.log("[WalletProvider] disconnect function FINISHED.");
    }
  }, [abstractLogout, refetchAccount]);

  const combinedLoading = isAccountLoading || isLoginLoading;
  const combinedError = rawAccountError || rawLoginError || actionError;

  useEffect(() => {
    if (combinedError) {
      console.error("[WalletProvider] Combined Error State:", combinedError);
    }
  }, [combinedError]);

  return (
    <WalletContext.Provider value={{
      walletAddress,
      connect,
      disconnect,
      isLoading: combinedLoading, // True if account data is loading OR login hook is loading
      isConnecting: isConnectingState,
      isDisconnecting: isDisconnectingState, // Pass disconnect loading state
      error: combinedError,
      account: accountData,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);

