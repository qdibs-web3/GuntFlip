// src/context/WalletProvider.js
// This is WalletProvider_rollback.js with ULTRA MINIMAL changes to add abstractLogout.
// The goal is to see if simply destructuring abstractLogout or using it in disconnect breaks address retrieval.
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
  // No isDisconnecting in context for this test, to match Navbar_rollback_fixed.js
  error: null,
  account: null,
});

export const WalletProvider = ({ children }) => {
  const accountHookResult = useGlobalWalletSignerAccount();
  // MINIMAL CHANGE 1: Destructure logout (as abstractLogout) from useLoginWithAbstract
  const { login: abstractLogin, logout: abstractLogout, isLoading: rawIsLoginLoading, error: rawLoginError } = useLoginWithAbstract();

  console.log("[WalletProvider] Initial useGlobalWalletSignerAccount result:", accountHookResult);
  console.log("[WalletProvider] Initial useLoginWithAbstract result (includes abstractLogout):");

  const { data: accountData, isLoading: rawIsAccountLoading, error: rawAccountError, refetch: refetchAccount } = accountHookResult;

  const isAccountLoading = typeof rawIsAccountLoading === "boolean" ? rawIsAccountLoading : false;
  const isLoginLoading = typeof rawIsLoginLoading === "boolean" ? rawIsLoginLoading : false;

  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnectingState, setIsConnectingState] = useState(false);
  // No isDisconnectingState for this ultra minimal test
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
      console.log("[WalletProvider] IMMEDIATELY after abstractLogin - current accountData:", accountHookResult.data);
      console.log("[WalletProvider] IMMEDIATELY after abstractLogin - current isAccountLoading:", accountHookResult.isLoading);
    } catch (err) {
      console.error("[WalletProvider] Error during abstractLogin call:", err);
      setActionError(err);
    } finally {
      setIsConnectingState(false);
      console.log("[WalletProvider] connect function FINISHED.");
    }
  }, [abstractLogin, isConnectingState, isLoginLoading, isAccountLoading, accountHookResult]);

  // MINIMAL CHANGE 2: Update disconnect to use abstractLogout
  const disconnect = useCallback(async () => {
    console.log("[WalletProvider] disconnect function CALLED (ultra minimal with SDK logout).");
    if (typeof abstractLogout !== "function") {
      console.warn("[WalletProvider] abstractLogout function is not available. Clearing local state only.");
      setWalletAddress(null); // Fallback
      setActionError(new Error("SDK logout not available for disconnect."));
      if (typeof refetchAccount === "function") { refetchAccount(); }
      return;
    }
    // No isDisconnectingState for this ultra minimal test
    setActionError(null);
    try {
      console.log("[WalletProvider] Calling abstractLogout (ultra minimal)...");
      await abstractLogout();
      console.log("[WalletProvider] abstractLogout COMPLETED (ultra minimal).");
      if (typeof refetchAccount === "function") {
        console.log("[WalletProvider] Refetching account data after abstractLogout (ultra minimal)...'");
        await refetchAccount();
      }
    } catch (err) {
      console.error("[WalletProvider] Error during abstractLogout call (ultra minimal):", err);
      setActionError(err);
    } 
    // No finally block setting isDisconnectingState for this ultra minimal test
    console.log("[WalletProvider] disconnect function FINISHED (ultra minimal).");
  }, [abstractLogout, refetchAccount]); // Added abstractLogout to dependencies

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
      // No isDisconnecting in context for this test
      error: combinedError,
      account: accountData,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);

