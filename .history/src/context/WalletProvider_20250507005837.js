// src/context/WalletProvider.js
// This is WalletProvider_ultra_minimal_logout_fixed.js with an updated useEffect dependency.
// The goal is to make the useEffect more sensitive to actual address changes.
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

  const isAccountLoading = typeof rawIsAccountLoading === "boolean" ? rawIsAccountLoading : false;
  const isLoginLoading = typeof rawIsLoginLoading === "boolean" ? rawIsLoginLoading : false;

  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnectingState, setIsConnectingState] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    console.log("[WalletProvider] useEffect for accountData triggered. Current accountData:", accountData, "Current accountData?.address:", accountData?.address);
    if (accountData?.address) {
      setWalletAddress(accountData.address);
      console.log("[WalletProvider] Wallet address SET from accountData:", accountData.address);
    } else {
      // Only set to null if it was previously not null, to avoid unnecessary re-renders if accountData is initially undefined then becomes null
      if (walletAddress !== null) {
        setWalletAddress(null);
        console.log("[WalletProvider] Wallet address set to NULL (no accountData.address or accountData is null).");
      }
    }
  }, [accountData, accountData?.address]); // MODIFIED: Added accountData?.address to dependency array

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
      setWalletAddress(null);
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

