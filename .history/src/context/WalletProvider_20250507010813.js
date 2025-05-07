// src/context/WalletProvider.js
// This version attempts to use a more direct derived state for walletAddress.
// It removes the local walletAddress state and the useEffect that sets it,
// deriving walletAddress directly from accountData in the context value.
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
  const { login: abstractLogin, logout: abstractLogout, isLoading: rawIsLoginLoading, error: rawLoginError } = useLoginWithAbstract();

  console.log("[WalletProvider] Initial useGlobalWalletSignerAccount result:", accountHookResult);
  console.log("[WalletProvider] Initial useLoginWithAbstract result (includes abstractLogout):");

  const { data: accountData, isLoading: rawIsAccountLoading, error: rawAccountError, refetch: refetchAccount } = accountHookResult;

  // Log accountData whenever it changes to see its structure and when it updates
  useEffect(() => {
    console.log("[WalletProvider] accountData from SDK hook changed:", accountData);
  }, [accountData]);

  const isAccountLoading = typeof rawIsAccountLoading === "boolean" ? rawIsAccountLoading : false;
  const isLoginLoading = typeof rawIsLoginLoading === "boolean" ? rawIsLoginLoading : false;

  // REMOVED: const [walletAddress, setWalletAddress] = useState(null);
  // REMOVED: useEffect that set walletAddress from accountData.

  const [isConnectingState, setIsConnectingState] = useState(false);
  const [actionError, setActionError] = useState(null);

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
    } catch (err) {
      console.error("[WalletProvider] Error during abstractLogin call:", err);
      setActionError(err);
    } finally {
      setIsConnectingState(false);
      console.log("[WalletProvider] connect function FINISHED.");
    }
  }, [abstractLogin, isConnectingState, isLoginLoading, isAccountLoading]);

  const disconnect = useCallback(async () => {
    console.log("[WalletProvider] disconnect function CALLED (ultra minimal with SDK logout).");
    if (typeof abstractLogout !== "function") {
      console.warn("[WalletProvider] abstractLogout function is not available. Clearing local state only.");
      // No local walletAddress state to set to null directly here, relies on accountData becoming null
      setActionError(new Error("SDK logout not available for disconnect."));
      if (typeof refetchAccount === "function") { refetchAccount(); }
      return;
    }
    setActionError(null);
    try {
      console.log("[WalletProvider] Calling abstractLogout (ultra minimal)...");
      await abstractLogout();
      console.log("[WalletProvider] abstractLogout COMPLETED (ultra minimal).");
      if (typeof refetchAccount === "function") {
        console.log("[WalletProvider] Refetching account data after abstractLogout (ultra minimal)...");
        await refetchAccount();
      }
    } catch (err) {
      console.error("[WalletProvider] Error during abstractLogout call (ultra minimal):", err);
      setActionError(err);
    } 
    console.log("[WalletProvider] disconnect function FINISHED (ultra minimal).");
  }, [abstractLogout, refetchAccount]);

  const combinedLoading = isAccountLoading || isLoginLoading;
  const combinedError = rawAccountError || rawLoginError || actionError;

  useEffect(() => {
    if (combinedError) {
      console.error("[WalletProvider] Combined Error State:", combinedError);
    }
  }, [combinedError]);

  // MODIFIED: Directly use accountData?.address for walletAddress in context value
  const derivedWalletAddress = accountData?.address || null;
  console.log("[WalletProvider] Providing context value. DerivedWalletAddress:", derivedWalletAddress, "AccountData:", accountData);

  return (
    <WalletContext.Provider value={{
      walletAddress: derivedWalletAddress,
      connect,
      disconnect,
      isLoading: combinedLoading,
      isConnecting: isConnectingState,
      error: combinedError,
      account: accountData, // Pass the full accountData object as well
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);

