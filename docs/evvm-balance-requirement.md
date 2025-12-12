# EVVM Balance Requirement

## Important: Users Must Deposit Tokens First

EVVM gasless transactions require users to have a **balance in the EVVM contract**, not just in their wallet. This is different from traditional transactions.

## How EVVM Balance Works

1. **Users deposit tokens** into the EVVM contract via the Treasury contract
2. **EVVM maintains internal balances** for each user
3. **Gasless transactions** use these internal balances, not wallet balances

## How to Deposit Tokens

### Option 1: Use Treasury Contract (Recommended)

The Treasury contract provides a `deposit()` function:

```solidity
// For Principal Token (MATE)
treasury.deposit(principalTokenAddress, amount)

// For native token (CELO/ETH)
treasury.deposit(address(0), amount) // with msg.value
```

### Option 2: Use EVVM addBalance (Testnet Only)

On testnet, the EVVM contract has a public `addBalance()` function for testing:

```solidity
evvm.addBalance(userAddress, tokenAddress, amount)
```

## Checking User Balance

You can check a user's balance in the EVVM contract:

```solidity
uint256 balance = evvm.getBalance(userAddress, tokenAddress);
```

## Common Error: Insufficient Balance

If you see errors like:
- `UpdateBalanceFailed()`
- `InsufficientBalance()`
- Transaction reverts during `estimateGas`

**Solution**: The user needs to deposit tokens into the EVVM contract first.

## Integration Steps

1. **Before gasless transactions**, check if user has sufficient balance
2. **If balance is insufficient**, prompt user to deposit via Treasury
3. **After deposit**, user can use gasless transactions

## Example Frontend Flow

```typescript
// 1. Check balance
const balance = await evvmContract.getBalance(userAddress, principalTokenAddress);
const requiredAmount = calculatedFee + priorityFee;

if (balance < requiredAmount) {
  // 2. Prompt user to deposit
  throw new Error(`Insufficient EVVM balance. You need ${requiredAmount} tokens. Please deposit via Treasury first.`);
}

// 3. Proceed with gasless transaction
```
