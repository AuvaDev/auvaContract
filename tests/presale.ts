import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { Presale } from "../target/types/presale";
import {
  PublicKey,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { BN } from "bn.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

import adminSecretArray from "./wallets/admin.json";
import userSecretArray from "./wallets/user.json";

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe("presale", () => {

  anchor.setProvider(anchor.AnchorProvider.env());
  const connection = new Connection("https://denny-wuerxw-fast-devnet.helius-rpc.com/", "confirmed");
  const program = anchor.workspace.Presale as Program<Presale>;
  const PROGRAM_ID = program.programId;

  const PRESALE_SEED = "PRESALE_SEED";
  const USER_SEED = "USER_SEED";
  const PRESALE_VAULT = "PRESALE_VAULT";

  console.log("admin secret key", adminSecretArray);
  const admin = Keypair.fromSecretKey(Uint8Array.from(adminSecretArray));
  console.log("adminSecretArray displayed.\n");
  const adminPubkey = admin.publicKey;

  console.log("admin secret key", adminSecretArray);
  const user = Keypair.fromSecretKey(Uint8Array.from(userSecretArray));
  console.log("userSecretArray displayed.\n");
  const userPubkey = user.publicKey;

  const buyerWallet = anchor.AnchorProvider.env().wallet;
  const buyer = anchor.AnchorProvider.env().wallet as anchor.Wallet;
  const buyerPubkey = buyerWallet.publicKey;

  let mint: PublicKey;
  let adminAta: PublicKey;
  const tokenDecimal = 9;
  const amount = new BN(1000000000).mul(new BN(10 ** tokenDecimal));

  const softCapAmount = new BN(300000);
  const hardCapAmount = new BN(500000);
  const maxTokenAmountPerAddress = new BN(1000);
  const pricePerToken = new BN(100);

  const updateSoftCapAmount = new BN(400000);
  const updateHardCapAmount = new BN(600000);
  const updateMaxTokenAmountPerAddress = new BN(2000);
  const updatePricePerToken = new BN(200);

  let startTime = new BN(Date.now());
  const presaleDuration = new BN(5000);
  let endTime = startTime.add(presaleDuration);

  const presaleAmount = new BN(300000000).mul(new BN(10 ** tokenDecimal));

  const quoteSolAmountInLamport = new BN(10000);

  const withdrawSolAmount = new BN(1);

  const withdrawTokenAmount = new BN(1);

  const getUserInfoPDA = async () => {
    return (
      await PublicKey.findProgramAddressSync(
        [Buffer.from(USER_SEED), buyerPubkey.toBuffer()],
        PROGRAM_ID
      )
    )[0];
  };

  const getPresaleInfoPDA = async () => {
    return (
      await PublicKey.findProgramAddressSync(
        [Buffer.from(PRESALE_SEED)],
        PROGRAM_ID
      )
    );
  };

  const getVaultPDA = async () => {
    return (
      await PublicKey.findProgramAddressSync(
        [Buffer.from(PRESALE_VAULT)],
        PROGRAM_ID
      )
    );
  };

  it("Mint token to admin wallet", async () => {
    console.log("Trying to create and mint token to admin's wallet.");
    console.log("Here, contract uses this token as LP token");
    console.log(
      (await connection.getBalance(adminPubkey)) / LAMPORTS_PER_SOL
    );

    try {
      mint = await createMint(
        connection,
        admin,
        adminPubkey,
        adminPubkey,
        tokenDecimal
      );

      console.log("token mint address: " + mint.toBase58());
      adminAta = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          admin,
          mint,
          adminPubkey
        )
      ).address;
      console.log("Admin associated token account address: " + adminAta.toBase58());

      await mintTo(
        connection,
        admin,
        mint,
        adminAta,
        adminPubkey,
        BigInt(amount.toString())
      );

      const tokenBalance = await connection.getTokenAccountBalance(adminAta);

      console.log("tokenBalance in adminAta: ", tokenBalance.value.uiAmount);
      console.log("-----token successfully minted!!!-----");
    } catch (error) {
      console.log("-----Token creation error----- \n", error);
    }
  });

  it("Created Presale!", async () => {
    try {
      const [presaleInfoPDA] = await getPresaleInfoPDA();
      console.log("presale pda", presaleInfoPDA.toBase58());
      const tx = await program.methods
        .createPresale(
          mint,
          BigInt(softCapAmount.toString()),
          BigInt(hardCapAmount.toString()),
          BigInt(maxTokenAmountPerAddress.toString()),
          BigInt(pricePerToken.toString()),
        )
        .accounts({
          presaleInfo: presaleInfoPDA,
          authority: adminPubkey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .transaction();
      
      tx.feePayer = admin.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      console.log(await connection.simulateTransaction(tx));

      const signature = await sendAndConfirmTransaction(connection, tx, [admin]);

      console.log(`Transaction success: \n https://solscan.io/tx/${signature}?cluster=devnet`);

      const presaleInfo = await program.account.presaleInfo.fetch(presaleInfoPDA);
      console.log("presale info", presaleInfo);

    } catch (error) {
      console.log("presale creation error", error);
    }
  })

  it("Update Presale!", async () => {
    try {
      const [presaleInfoPDA] = await getPresaleInfoPDA();
      const tx = await program.methods
        .updatePresale(
          updateSoftCapAmount,
          updateHardCapAmount,
          updateMaxTokenAmountPerAddress,
          updatePricePerToken
        )
        .accounts({
          presaleInfo: presaleInfoPDA,
          authority: adminPubkey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .transaction();

      tx.feePayer = admin.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      console.log(await connection.simulateTransaction(tx));

      const signature = await sendAndConfirmTransaction(connection, tx, [admin]);

      console.log(`Transaction success: \n https://solscan.io/tx/${signature}?cluster=devnet`);
      const presaleInfo = await program.account.presaleInfo.fetch(presaleInfoPDA);
      console.log("presale info", presaleInfo);
    } catch (error) {
      console.log("update presale error", error);
    }
  })

  it("Token is deposited!", async () => {
    try {
      const [presaleInfoPDA] = await getPresaleInfoPDA();
      const [presaleVault] = await getVaultPDA();
      console.log("presale pda, presale vault", presaleInfoPDA.toBase58(), presaleVault.toBase58());

      const toAssociatedTokenAccount = await getAssociatedTokenAddress(
        mint,
        presaleInfoPDA,
        true
      );
      console.log("to associated token account", toAssociatedTokenAccount.toBase58());

      const tx = await program.methods
        .depositToken(presaleAmount)
        .accounts({
          mintAccount: mint,
          fromAssociatedTokenAccount: adminAta,
          toAssociatedTokenAccount: toAssociatedTokenAccount,
          presaleVault: presaleVault,
          presaleInfo: presaleInfoPDA,
          admin: adminPubkey,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        })
        .signers([admin])
        .transaction();

      tx.feePayer = admin.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      console.log(await connection.simulateTransaction(tx))

      const signature = await sendAndConfirmTransaction(connection, tx, [admin]);
      console.log(
        `Transaction succcess: \n https://solscan.io/tx/${signature}?cluster=devnet`
      );
      console.log("Token mint address: ", mint.toBase58());
      console.log(
        "Token balance of presaleAta: ",
        await connection.getTokenAccountBalance(toAssociatedTokenAccount)
      );
      console.log(
        "Sol balance of presale vault: ",
        await connection.getBalance(presaleVault)
      );
    } catch (error) {
      console.log("deposit error", error);
    }
    
  });

  it("Presale start!", async () => {
    try {
      const [presaleInfoPDA] = await getPresaleInfoPDA();

      startTime = new BN(Date.now());
      endTime = startTime.add(presaleDuration);

      const tx = await program.methods
        .startPresale(startTime, endTime)
        .accounts({
          presaleInfo: presaleInfoPDA,
          authority: adminPubkey,
        })
        .signers([admin])
        .transaction();

      tx.feePayer = admin.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signature = await sendAndConfirmTransaction(connection, tx, [admin]);

      console.log(
        `Transaction success: \n https://solscan.io/tx/${signature}?cluster=devnet`
      );
      console.log("Start time: ", new Date(parseInt(startTime.toString())), "----", startTime.toNumber());
      console.log("End time: ", new Date(parseInt(endTime.toString())), "----", endTime.toNumber());
    } catch (error) {
      console.log("presale start", error);
    }
    
  });

  it("Buy token!", async () => {
    try {
      const [presaleInfoPDA] = await getPresaleInfoPDA();
      const [presaleVault] = await getVaultPDA();

      const tx = await program.methods
        .buyToken(quoteSolAmountInLamport)
        .accounts({
          presaleInfo: presaleInfoPDA,
          presaleVault: presaleVault,
          presaleAuthority: adminPubkey,
          buyer: buyerPubkey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([admin])
        .transaction();

      tx.feePayer = buyerPubkey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      console.log(await connection.simulateTransaction(tx));
      
      const signature = await sendAndConfirmTransaction(connection, tx, [user]);

      console.log(`Transaction success: \n https://solscan.io/tx/${signature}?cluster=devnet`);
      
      const presaleInfo = await program.account.presaleInfo.fetch(presaleInfoPDA);
      console.log("presale info", presaleInfo);
    } catch (error) {
      console.log("buy token", error);
    }
  })

  it("Claim token!", async () => {
    try {
      console.log("waiting for some seconds for presale to end")
      await sleep(6000)
      const [presaleInfoPDA, bump] = await getPresaleInfoPDA();

      const presalePresaleTokenAssociatedTokenAccount = await getAssociatedTokenAddress(
        mint,
        presaleInfoPDA,
        true
      );
      console.log("presale ATA: ", presalePresaleTokenAssociatedTokenAccount);
      console.log("token balance: ", await connection.getTokenAccountBalance(presalePresaleTokenAssociatedTokenAccount));

      const buyerPresaleTokenAssociatedTokenAccount = await getAssociatedTokenAddress(
        mint,
        buyerPubkey,
        true
      )
      console.log("buyer ATA: ", presalePresaleTokenAssociatedTokenAccount);
      console.log("token balance: ", await connection.getTokenAccountBalance(presalePresaleTokenAssociatedTokenAccount));

      const userInfo = await getUserInfoPDA();
      const [presaleInfo] = await getPresaleInfoPDA();

      const tx = await program.methods
        .claimToken(bump)
        .accounts({
          presaleTokenMintAccount: mint,
          buyerPresaleTokenAssociatedTokenAccount: buyerPresaleTokenAssociatedTokenAccount,
          presalePresaleTokenAssociatedTokenAccount: presalePresaleTokenAssociatedTokenAccount,
          userInfo: userInfo,
          presaleInfo: presaleInfo,
          presaleAuthority: adminPubkey,
          buyer: buyerPubkey,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([buyer.payer])
        .transaction();

      tx.feePayer = buyerPubkey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      console.log(await connection.simulateTransaction(tx))

      const signature = await sendAndConfirmTransaction(connection, tx, [buyer.payer as Keypair]);

      const presaleTokenBalance = await connection.getTokenAccountBalance(presalePresaleTokenAssociatedTokenAccount);
      const buyerTokenBalance = await connection.getTokenAccountBalance(buyerPresaleTokenAssociatedTokenAccount);

      console.log(`Transaction success: \n https://solscan.io/tx/${signature}?cluster=devnet`);

      console.log("The balance of the token of the presale: ", presaleTokenBalance);
      console.log("The balance of the token of the user: ", buyerTokenBalance);
    } catch (error) {
      console.log("claim token", error)
    }
    
  })

  it("Withdraw token!", async () => {
    try {
      const [presaleInfoPDA, bump] = await getPresaleInfoPDA();

      const presaleAssociatedTokenAccount = await getAssociatedTokenAddress(
        mint,
        presaleInfoPDA,
        true
      );

      const tx = await program.methods
        .withdrawToken(withdrawTokenAmount, bump)
        .accounts({
          mintAccount: mint,
          adminAssociatedTokenAccount: adminAta,
          presaleAssociatedTokenAccount: presaleAssociatedTokenAccount,
          presaleTokenMintAccount: mint,
          presaleInfo: presaleInfoPDA,
          adminAuthority: adminPubkey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: web3.SystemProgram.programId,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        })
        .signers([admin])
        .transaction();

      tx.feePayer = adminPubkey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signature = await sendAndConfirmTransaction(connection, tx, [admin as Keypair]);

      const presaleTokenBalance = await connection.getTokenAccountBalance(presaleAssociatedTokenAccount);
      const adminTokenBalance = await connection.getTokenAccountBalance(adminAta);

      console.log("The token balance of the presale vault: ", presaleTokenBalance);
      console.log("The token balance of the admin: ", adminTokenBalance);
    } catch (error) {
      console.log("withdraw token error", error);
    }
  })

  it("Withdraw sol!", async () => {
    try {
      const [presaleInfoPDA] = await getPresaleInfoPDA();
      const [presaleVault, bump] = await getVaultPDA();

      const tx = await program.methods
        .withdrawSol(withdrawSolAmount, bump)
        .accounts({
          presaleInfo: presaleInfoPDA,
          presaleVault: presaleVault,
          admin: adminPubkey,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([admin])
        .transaction();

      tx.feePayer = admin.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      console.log(await connection.simulateTransaction(tx));
      
      const signature = await sendAndConfirmTransaction(connection, tx, [admin]);
      
      console.log(`Transaction success: \n https://solscan.io/tx/${signature}?cluster=devnet`);

      const vaultBalance = await connection.getBalance(presaleVault);
      const adminBalance = await connection.getBalance(admin.publicKey);

      console.log("The balance of the presale vault: ", vaultBalance);
      console.log("The balance of the admin: ", adminBalance);
    } catch (error) {
      console.log("withdraw sol", error);
    }
  }
)
});
