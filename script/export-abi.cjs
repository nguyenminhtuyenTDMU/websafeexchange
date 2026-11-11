// Xuất ABI của escrow và verifier từ artifacts Hardhat sang client/src/lib/abi.ts.
// Chạy sau khi compile: npx hardhat compile --config hardhat.config.cjs && node script/export-abi.cjs
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const art = (rel) => require(path.join(root, 'artifacts', 'contracts', rel)).abi;

const out = [
  '// Sinh tự động bởi script/export-abi.cjs. Không sửa tay.',
  `export const escrowAbi = ${JSON.stringify(art('CleanHandoverEscrow.sol/CleanHandoverEscrow.json'), null, 2)} as const;`,
  '',
  `export const verifierAbi = ${JSON.stringify(art('verifiers/SafeWalletVerifier.sol/SafeWalletVerifier.json'), null, 2)} as const;`,
  '',
].join('\n');

fs.writeFileSync(path.join(root, 'client', 'src', 'lib', 'abi.ts'), out);
console.log('Đã ghi client/src/lib/abi.ts');
