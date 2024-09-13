import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PresaleContract } from "../target/types/presale_contract";
import { Keypair } from "@solana/web3.js";

describe("contracts", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  const wallet = provider.wallet as anchor.Wallet;

  anchor.setProvider(provider);

  const program = anchor.workspace.PresaleContract as Program<PresaleContract>;

  const mintKeypair = Keypair.generate();
  const metadata = {
    name: "Dust",
    symbol: "DUST",
    uri: "https://sapphire-sophisticated-panda-344.mypinata.cloud/ipfs/QmQ6zgMmkoaN234NKL6WDYi9FDHySXNiywtVs7Bmkho9eb",
  };

  it("Is initialized!", async () => {
    const tx = await program.methods
      .initialize(metadata.name, metadata.symbol, metadata.uri)
      .accounts({
        payer: wallet.payer.publicKey,
        mintAccount: mintKeypair.publicKey,
      })
      .signers([mintKeypair, wallet.payer])
      .rpc();

    console.log(
      `     Transaction Signature: https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );
    console.log(
      `     Token : https://explorer.solana.com/token/${mintKeypair.publicKey}?cluster=devnet`
    );
  });
});
