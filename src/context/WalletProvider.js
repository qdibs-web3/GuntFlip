// src/context/WalletProvider.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  useGlobalWalletSignerAccount,
  useLoginWithAbstract,
} from '@abstract-foundation/agw-react';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const { data: account } = useGlobalWalletSignerAccount();
  const { login } = useLoginWithAbstract();
  const [walletAddress, setWalletAddress] = useState(null);

  useEffect(() => {
    if (account?.address) {
      setWalletAddress(account.address);
    }
  }, [account]);

  return (
    <WalletContext.Provider value={{ walletAddress, connect: login }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
