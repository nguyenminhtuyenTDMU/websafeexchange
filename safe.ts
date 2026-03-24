import Safe, { EthersAdapter } from '@safe-global/protocol-kit'
import { ethers } from 'ethers'

const provider = new ethers.BrowserProvider(window.ethereum)
const signer = await provider.getSigner()

const ethAdapter = new EthersAdapter({
  ethers,
  signerOrProvider: signer,
})

// ⚠️ KHÔNG dùng Safe.create
const safe = new Safe({
  ethAdapter,
  safeAddress: '0xSAFE_ADDRESS_CUA_BAN',
})
