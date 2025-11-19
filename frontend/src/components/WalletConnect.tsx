import { HoloPanel, HoloText, HoloButton } from './ui/index'

interface WalletConnectProps {
  account: string | null
  isCorrectNetwork: boolean
  onConnect: () => void
}

function WalletConnect({ account, isCorrectNetwork, onConnect }: WalletConnectProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <HoloPanel variant="elevated" size="lg">
      {!account ? (
        <div>
          <HoloText as="h2" size="lg" weight="bold" className="mb-4 text-fuchsia-300 drop-shadow-[0_0_15px_rgba(225,68,255,0.8)]">
            Connect Your Wallet
          </HoloText>
          <HoloText size="sm" className="mb-6 text-white/80">
            Connect your MetaMask or Celo wallet to get started
          </HoloText>
          <HoloButton variant="primary" size="lg" onClick={onConnect}>
            Connect Wallet
          </HoloButton>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <HoloText as="h2" size="lg" weight="bold" className="text-fuchsia-300 drop-shadow-[0_0_15px_rgba(225,68,255,0.8)]">
            Wallet Connected
            </HoloText>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${isCorrectNetwork ? 'bg-green-400/20 border border-green-400/30' : 'bg-red-400/20 border border-red-400/30'}`}>
              <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-green-400' : 'bg-red-400'} neon-flicker`} />
              <HoloText size="xs" className={isCorrectNetwork ? 'text-green-300' : 'text-red-300'}>
              {isCorrectNetwork ? '✓ Connected' : '⚠ Wrong Network'}
              </HoloText>
            </div>
          </div>
          <div className="space-y-2">
            <HoloText size="sm" className="text-white/80">
              <strong>Address:</strong> <code className="text-cyan-300 font-mono">{formatAddress(account)}</code>
            </HoloText>
          {isCorrectNetwork && (
              <HoloText size="xs" className="text-green-300">
                ✓ Connected to Celo Sepolia Testnet
              </HoloText>
          )}
          </div>
        </div>
      )}
    </HoloPanel>
  )
}

export default WalletConnect

