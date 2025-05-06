// src/context/WalletProvider.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  useGlobalWalletSignerAccount,
  useLoginWithAbstract,
} from '@abstract-foundation/agw-react';

const WalletContext = createContext({
  walletAddress: null,
  connect: () => {},
  isLoading: false,
  error: null,
});

export const WalletProvider = ({ children }) => {
  // Get account data
  const { data: account, isLoading: isAccountLoading, error: accountError } = useGlobalWalletSignerAccount();
  // Get login function and its state
  const { login, isLoading: isLoginLoading, error: loginError } = useLoginWithAbstract();

  const [walletAddress, setWalletAddress] = useState(null);

  // Update wallet address when account data changes
  useEffect(() => {
    if (account?.address) {
      setWalletAddress(account.address);
    } else {
      // Reset address if account becomes unavailable (e.g., disconnect)
      setWalletAddress(null);
    }
  }, [account]);

  // Combine loading states and errors
  const isLoading = isAccountLoading || isLoginLoading;
  const error = accountError || loginError;

  // Log errors for debugging
  useEffect(() => {
    if (error) {
      console.error("Wallet Provider Error:", error);
    }
  }, [error]);

  // Log account changes for debugging
  useEffect(() => {
    console.log("Account Data:", account);
    console.log("Wallet Address State:", account?.address);
  }, [account]);

  return (
    <WalletContext.Provider value={{ walletAddress, connect: login, isLoading, error }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);


