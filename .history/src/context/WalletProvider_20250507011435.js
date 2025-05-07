// src/context/WalletProvider.js
// This version corrects how accountData is accessed from the SDK hook.
// It assumes useGlobalWalletSignerAccount() directly returns the account object.
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
  account: null, // Will hold the full account object from the SDK
});

export const WalletProvider = ({ children }) => {
  // accountHookResult IS the account data object, not a wrapper with a .data property
  const accountData = useGlobalWalletSignerAccount(); 
  const { login: abstractLogin, logout: abstractLogout, isLoading: rawIsLoginLoading, error: rawLoginError } = useLoginWithAbstract();

  console.log("[WalletProvider] SDK useGlobalWalletSignerAccount() direct result (accountData):");
  console.dir(accountData); // Log the whole object to inspect its structure
  console.log("[WalletProvider] SDK useLoginWithAbstract() result (login/logout):");
  console.dir({ abstractLogin, abstractLogout, rawIsLoginLoading, rawLoginError});

  // isLoading for account data is part of the accountData object itself if the SDK follows common patterns (e.g., accountData.isLoading)
  // For now, let's assume the hook updates accountData to null/undefined when loading or not connected.
  const isAccountLoading = accountData === undefined; // Simplistic check, might need refinement based on SDK's loading state exposure
  const isLoginLoading = typeof rawIsLoginLoading === "boolean" ? rawIsLoginLoading : false;

  const [isConnectingState, setIsConnectingState] = useState(false);
  const [actionError, setActionError] = useState(null);

  // The walletAddress is now directly derived from accountData.address
  const derivedWalletAddress = accountData?.address || null;

  useEffect(() => {
    console.log("[WalletProvider] accountData from SDK hook changed. Current derivedWalletAddress:", derivedWalletAddress);
    if (derivedWalletAddress) {
      console.log("[WalletProvider] Wallet address is now available:", derivedWalletAddress);
    } else {
      console.log("[WalletProvider] Wallet address is NULL.");
    }
  }, [derivedWalletAddress]); // React to changes in the derived address

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
      // After login, the accountData object (from useGlobalWalletSignerAccount) should update,
      // which will cause derivedWalletAddress to update, and the useEffect above will log it.
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
      console.warn("[WalletProvider] abstractLogout function is not available. Cannot perform SDK logout.");
      setActionError(new Error("SDK logout not available for disconnect."));
      // Manually trigger a refetch or clear if possible, though SDK should handle its state
      // For now, we rely on accountData becoming null/undefined after SDK logout
      return;
    }
    setActionError(null);
    try {
      console.log("[WalletProvider] Calling abstractLogout...");
      await abstractLogout();
      console.log("[WalletProvider] abstractLogout COMPLETED.");
      // After SDK logout, accountData from useGlobalWalletSignerAccount should update to reflect disconnected state.
    } catch (err) {
      console.error("[WalletProvider] Error during abstractLogout call:", err);
      setActionError(err);
    } 
    console.log("[WalletProvider] disconnect function FINISHED.");
  }, [abstractLogout]);

  const combinedLoading = isAccountLoading || isLoginLoading;
  const combinedError = accountData?.error || rawLoginError || actionError; // Assuming SDK might put error in accountData

  useEffect(() => {
    if (combinedError) {
      console.error("[WalletProvider] Combined Error State:", combinedError);
    }
  }, [combinedError]);

  console.log("[WalletProvider] RENDERING. Providing context value. DerivedWalletAddress:", derivedWalletAddress, "Full accountData:", accountData);

  return (
    <WalletContext.Provider value={{
      walletAddress: derivedWalletAddress,
      connect,
      disconnect,
      isLoading: combinedLoading,
      isConnecting: isConnectingState,
      error: combinedError,
      account: accountData, // Provide the full accountData object from the SDK
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);

