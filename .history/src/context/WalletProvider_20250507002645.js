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
  isLoading: false,
  isConnecting: false,
  error: null,
  account: null,
});

export const WalletProvider = ({ children }) => {
  const accountHookResult = useGlobalWalletSignerAccount();
  const loginHookResult = useLoginWithAbstract();

  // console.log("[WalletProvider] Initial useGlobalWalletSignerAccount result:", accountHookResult);
  // console.log("[WalletProvider] Initial useLoginWithAbstract result:", loginHookResult);

  const { data: accountData, isLoading: rawIsAccountLoading, error: rawAccountError, refetch: refetchAccount } = accountHookResult;
  const { login: abstractLogin, isLoading: rawIsLoginLoading, error: rawLoginError, logout: abstractLogout } = loginHookResult; // Added abstractLogout

  const isAccountLoading = typeof rawIsAccountLoading === "boolean" ? rawIsAccountLoading : false;
  const isLoginLoading = typeof rawIsLoginLoading === "boolean" ? rawIsLoginLoading : false;

  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnectingState, setIsConnectingState] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    console.log("[WalletProvider] useEffect for accountData triggered. Current accountData:", accountData);
    if (accountData?.address) {
      setWalletAddress(accountData.address);
      console.log("[WalletProvider] Wallet address SET to:", accountData.address, "(from accountData)");
    } else {
      setWalletAddress(null);
      console.log("[WalletProvider] Wallet address set to NULL (no accountData.address or accountData is null).");
    }
  }, [accountData]);

  const connect = useCallback(async () => {
    console.log("[WalletProvider] connect function CALLED.");
    // console.log("[WalletProvider] Before connect - current accountData:", accountHookResult.data);
    // console.log("[WalletProvider] Before connect - current isAccountLoading:", accountHookResult.isLoading);

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
      // console.log("[WalletProvider] IMMEDIATELY after abstractLogin - current accountData:", accountHookResult.data);
      // console.log("[WalletProvider] IMMEDIATELY after abstractLogin - current isAccountLoading:", accountHookResult.isLoading);
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
    setActionError(null);
    if (typeof abstractLogout === "function") {
      try {
        console.log("[WalletProvider] Calling abstractLogout...");
        await abstractLogout();
        console.log("[WalletProvider] abstractLogout COMPLETED.");
        // After logout, SDK should clear its state, leading to accountData becoming null/undefined
        // which should trigger the useEffect to setWalletAddress(null)
      } catch (err) {
        console.error("[WalletProvider] Error during abstractLogout call:", err);
        setActionError(err);
      }
    } else {
      console.warn("[WalletProvider] abstractLogout function not available from useLoginWithAbstract. Manual state clearing only.");
      // Fallback if SDK doesn't provide a logout, though this is less reliable for session clearing
      setWalletAddress(null);
    }
    // Optionally, refetch account data to confirm it's cleared by the SDK
    if (typeof refetchAccount === "function") {
        console.log("[WalletProvider] Refetching account data after disconnect attempt...");
        refetchAccount();
    }
  }, [abstractLogout, refetchAccount]);

  const combinedLoading = isAccountLoading || isLoginLoading;
  const combinedError = rawAccountError || rawLoginError || actionError;

  useEffect(() => {
    if (combinedError) {
      console.error("[WalletProvider] Combined Error State:", combinedError);
    }
    // console.log(`[WalletProvider] Current States: walletAddress: ${walletAddress}, combinedLoading: ${combinedLoading}, isConnectingState: ${isConnectingState}, error: ${combinedError ? JSON.stringify(combinedError) : null}`);
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

