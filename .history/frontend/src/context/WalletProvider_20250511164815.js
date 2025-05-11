// src/context/WalletProvider.js
import React, { createContext, useContext } from "react";
import {
  useAddress,
  useConnect,
  useDisconnect,
  metamaskWallet,
  coinbaseWallet,
  useUser,
} from "@thirdweb-dev/react";

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
  const address = useAddress();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const { isLoggedIn, user, isLoading, error } = useUser(); // optional if you're using thirdweb auth

  const handleConnect = async () => {
    try {
      await connect(metamaskWallet()); // or coinbaseWallet(), or a wallet chooser
    } catch (err) {
      console.error("Error connecting:", err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error("Error disconnecting:", err);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress: address || null,
        connect: handleConnect,
        disconnect: handleDisconnect,
        isLoading,
        isConnecting: false,
        error,
        account: address ? { address } : null,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
