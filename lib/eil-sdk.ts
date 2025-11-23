import { getClient } from "wagmi/actions";
import { getAccount, getWalletClient, reconnect } from "@wagmi/core";
import { getBalance, readContract, getBytecode } from "viem/actions";
import { type WalletClient, zeroAddress, type Address, erc20Abi } from "viem";
import {
  AmbireBundlerManager,
  CrossChainSdk,
  FunctionCallAction,
  getMultiChainConfig,
  type ExecCallback,
  type IMultiChainSmartAccount,
} from "@eil-protocol/sdk";
import { AmbireMultiChainSmartAccount } from "@eil-protocol/accounts";
import { wagmiConfig, CHAIN_IDS } from "@/app/config/wagmi";

// @todo - move to external config with other constants
const USDC_ADDRESSES: Record<number, Address> = {
  [CHAIN_IDS.BASE]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [CHAIN_IDS.ARBITRUM]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
};

// @todo - change overrides later
const USEROP_OVERRIDE = {
  maxFeePerGas: 90000000000n,
  maxPriorityFeePerGas: 100n,
};

const SUPPORTED_CHAINS = [BigInt(CHAIN_IDS.BASE), BigInt(CHAIN_IDS.ARBITRUM)];

async function fetchWalletClient(): Promise<WalletClient> {
  await reconnect(wagmiConfig);

  for (let attempt = 1; attempt <= 5; attempt++) {
    const account = getAccount(wagmiConfig);

    if (account.isConnected && account.connector?.getChainId) {
      return getWalletClient(wagmiConfig, { connector: account.connector });
    }

    if (attempt === 5) {
      throw new Error("Connector not ready after maximum attempts");
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Wallet client unavailable");
}

export async function createEilSdk(): Promise<{
  sdk: CrossChainSdk;
  account: AmbireMultiChainSmartAccount;
}> {
  const walletClient = await fetchWalletClient();
  const walletAccount = getAccount(wagmiConfig)?.address ?? zeroAddress;

  const ambireBundlerManager = new AmbireBundlerManager(
    walletClient,
    new Map<bigint, Address>()
  );

  const ambireAccount = new AmbireMultiChainSmartAccount(
    walletClient,
    walletAccount,
    SUPPORTED_CHAINS,
    ambireBundlerManager
  );

  await ambireAccount.init();

  const chainConfig = getMultiChainConfig();
  const baseConfig = chainConfig.find(
    (c) => Number(c.chainId) === CHAIN_IDS.BASE
  )!;
  const arbitrumConfig = chainConfig.find(
    (c) => Number(c.chainId) === CHAIN_IDS.ARBITRUM
  )!;

  console.log("EOA address:", walletAccount);
  console.log(
    "Base smart account:",
    ambireAccount.contractOn(BigInt(CHAIN_IDS.BASE)).address
  );
  console.log(
    "Arbitrum smart account:",
    ambireAccount.contractOn(BigInt(CHAIN_IDS.ARBITRUM)).address
  );
  console.log("Base RPC URL:", baseConfig.publicClient.transport.url);
  console.log("Arbitrum RPC URL:", arbitrumConfig.publicClient.transport.url);

  const baseClient = getClient(wagmiConfig, { chainId: CHAIN_IDS.BASE });
  const baseUsdcCode = await getBytecode(baseClient, {
    address: USDC_ADDRESSES[CHAIN_IDS.BASE],
  });
  console.log(
    "Base USDC contract exists:",
    baseUsdcCode && baseUsdcCode !== "0x"
  );
  console.log("Base USDC bytecode length:", baseUsdcCode?.length);

  return { sdk: new CrossChainSdk(), account: ambireAccount };
}

export async function fetchUSDCBalances(
  account: IMultiChainSmartAccount
): Promise<{
  baseBalance: bigint;
  arbitrumBalance: bigint;
  balanceEth0: bigint;
  balanceEth1: bigint;
}> {
  const baseClient = getClient(wagmiConfig, { chainId: CHAIN_IDS.BASE });
  const arbitrumClient = getClient(wagmiConfig, {
    chainId: CHAIN_IDS.ARBITRUM,
  });

  if (!baseClient || !arbitrumClient) {
    throw new Error("Clients not initialized");
  }

  const baseAccount = account.contractOn(BigInt(CHAIN_IDS.BASE));
  const arbitrumAccount = account.contractOn(BigInt(CHAIN_IDS.ARBITRUM));

  const [baseBalance, arbitrumBalance, balanceEth0, balanceEth1] =
    await Promise.all([
      readContract(baseClient, {
        address: USDC_ADDRESSES[CHAIN_IDS.BASE],
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [baseAccount.address],
      }),
      readContract(arbitrumClient, {
        address: USDC_ADDRESSES[CHAIN_IDS.ARBITRUM],
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [arbitrumAccount.address],
      }),
      getBalance(baseClient, { address: baseAccount.address }),
      getBalance(arbitrumClient, { address: arbitrumAccount.address }),
    ]);

  return { baseBalance, arbitrumBalance, balanceEth0, balanceEth1 };
}

export async function swapUSDC(
  sdk: CrossChainSdk,
  account: IMultiChainSmartAccount,
  fromChainId: number,
  toChainId: number,
  amount: bigint,
  callback: ExecCallback
): Promise<void> {
  const usdc = sdk.createToken("USDC", [
    { chainId: CHAIN_IDS.BASE, address: USDC_ADDRESSES[CHAIN_IDS.BASE] },
    {
      chainId: CHAIN_IDS.ARBITRUM,
      address: USDC_ADDRESSES[CHAIN_IDS.ARBITRUM],
    },
  ]);

  const fromAccount = account.contractOn(BigInt(fromChainId));
  const toAccount = account.contractOn(BigInt(toChainId));

  const createApproveAction = (target: Address, spender: Address) =>
    new FunctionCallAction({
      target,
      functionName: "approve",
      args: [spender, 0n],
      abi: erc20Abi,
      value: 0n,
    });

  const executor = await sdk
    .createBuilder()
    .startBatch(BigInt(fromChainId))
    .addVoucherRequest({
      ref: "usdc_swap",
      destinationChainId: BigInt(toChainId),
      tokens: [{ token: usdc, amount }],
    })
    .addAction(
      createApproveAction(
        usdc.addressOn(BigInt(fromChainId)),
        fromAccount.address
      )
    )
    .overrideUserOp(USEROP_OVERRIDE)
    .endBatch()
    .startBatch(BigInt(toChainId))
    .useAllVouchers()
    .addAction(
      createApproveAction(usdc.addressOn(BigInt(toChainId)), toAccount.address)
    )
    .endBatch()
    .useAccount(account)
    .buildAndSign();

  await executor.execute(callback);
}
