import { useCallback, useEffect, useState } from 'react'

function getWalletProviders() {
  if (typeof window === 'undefined') return []

  const providers = []
  const phantom = window.phantom?.solana
  const solflare = window.solflare

  if (phantom?.isPhantom) {
    providers.push({ id: 'phantom', name: 'Phantom', provider: phantom })
  }

  if (solflare?.isSolflare) {
    providers.push({ id: 'solflare', name: 'Solflare', provider: solflare })
  }

  return providers
}

function toAddress(publicKey) {
  if (!publicKey) return ''
  return typeof publicKey.toBase58 === 'function'
    ? publicKey.toBase58()
    : String(publicKey)
}

function shortAddress(address) {
  if (!address || address.length < 12) return address || ''
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

export function useWallet() {
  const [providers, setProviders] = useState([])
  const [wallet, setWallet] = useState(null)
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const refreshProviders = () => setProviders(getWalletProviders())

    refreshProviders()
    window.addEventListener('load', refreshProviders)

    return () => window.removeEventListener('load', refreshProviders)
  }, [])

  useEffect(() => {
    if (!wallet?.provider?.on) return

    const handleAccountChanged = (publicKey) => {
      const nextAddress = toAddress(publicKey)

      if (!nextAddress) {
        setWallet(null)
        setAddress('')
        return
      }

      setAddress(nextAddress)
    }

    const handleDisconnect = () => {
      setWallet(null)
      setAddress('')
    }

    wallet.provider.on('accountChanged', handleAccountChanged)
    wallet.provider.on('disconnect', handleDisconnect)

    return () => {
      wallet.provider.removeListener?.('accountChanged', handleAccountChanged)
      wallet.provider.removeListener?.('disconnect', handleDisconnect)
    }
  }, [wallet])

  const connect = useCallback(async (walletId) => {
    const selected = getWalletProviders().find((item) => item.id === walletId)

    if (!selected) {
      setProviders(getWalletProviders())
      setError('Wallet not detected. Install or unlock the wallet extension, then refresh.')
      return
    }

    setBusy(true)
    setError('')

    try {
      const response = await selected.provider.connect()
      const publicKey = response?.publicKey ?? selected.provider.publicKey
      const nextAddress = toAddress(publicKey)

      if (!nextAddress) {
        throw new Error('The wallet did not return a public key.')
      }

      setWallet(selected)
      setAddress(nextAddress)
      setProviders(getWalletProviders())
    } catch (err) {
      setError(err?.message || 'Wallet connection was cancelled or failed.')
    } finally {
      setBusy(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (!wallet) return

    setBusy(true)
    setError('')

    try {
      await wallet.provider.disconnect()
      setWallet(null)
      setAddress('')
    } catch (err) {
      setError(err?.message || 'Wallet disconnect failed. Check the wallet extension.')
    } finally {
      setBusy(false)
    }
  }, [wallet])

  return {
    providers,
    walletName: wallet?.name || '',
    address,
    shortAddress: shortAddress(address),
    busy,
    error,
    connect,
    disconnect,
  }
}
