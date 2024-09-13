import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PresaleContract } from "../target/types/presale_contract";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import {
  getMint,
} from "@solana/spl-token";

import { expectRevert } from "./utils";

describe("contracts", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  const wallet = provider.wallet as anchor.Wallet;

  anchor.setProvider(provider);

  const program = anchor.workspace.PresaleContract as Program<PresaleContract>;

  const mintKeypair = Keypair.generate();
  const treasury = Keypair.generate();

  const stableMint = new PublicKey(
    "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
  ); //USDC coin-dev

  beforeEach(async () => {
    const metadata = {
      name: "Dust",
      symbol: "DUST",
      uri: "https://sapphire-sophisticated-panda-344.mypinata.cloud/ipfs/QmQ6zgMmkoaN234NKL6WDYi9FDHySXNiywtVs7Bmkho9eb",
    };

    await program.methods
      .initialize(metadata.name, metadata.symbol, metadata.uri)
      .accounts({
        payer: wallet.payer.publicKey,
        mintAccount: mintKeypair.publicKey,
      })
      .signers([mintKeypair, wallet.payer])
      .rpc();
  });

  it("Buy token", async () => {
    console.log("/*********** Buy token with SOL ************/");
    
    const mintAccount = await getMint(
      provider.connection,
      mintKeypair.publicKey
    );
    const mintAuthority = new PublicKey(mintAccount.mintAuthority!);

    const tx = await program.methods
      .buy(new BN(1 * 10 ** 9), true)
      .accounts({
        buyer: wallet.publicKey,
        mint: mintKeypair.publicKey,
        stableMint,
        mintAuthority,
        treasury: treasury.publicKey,
      })
      .signers([wallet.payer])
      .rpc();

    console.log(
      `     Transaction Signature: https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );

    //Insufficent sol test.
    await expectRevert(
      program.methods
        .buy(new BN(1000 * 10 ** 9), true)
        .accounts({
          buyer: wallet.publicKey,
          mint: mintKeypair.publicKey,
          stableMint,
          mintAuthority,
          treasury: treasury.publicKey,
        })
        .signers([wallet.payer])
        .rpc()
    );

    console.log("    ✔ Insufficient sol");

    console.log("/*********** Buy token with USDC ************/");

    const tx2 = await program.methods
      .buy(new BN(1 * 10 ** 6), false)
      .accounts({
        buyer: wallet.publicKey,
        mint: mintKeypair.publicKey,
        stableMint,
        mintAuthority,
        treasury: treasury.publicKey,
      })
      .signers([wallet.payer])
      .rpc();

    console.log(
      `     Transaction Signature: https://explorer.solana.com/tx/${tx2}?cluster=devnet`
    );

    //Insufficent stable coin test.
    await expectRevert(
      program.methods
        .buy(new BN(1000 * 10 ** 6), false)
        .accounts({
          buyer: wallet.publicKey,
          mint: mintKeypair.publicKey,
          stableMint,
          mintAuthority,
          treasury: treasury.publicKey,
        })
        .signers([wallet.payer])
        .rpc()
    );

    console.log("    ✔ Insufficient USDC");
  });
});
