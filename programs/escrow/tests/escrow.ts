import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaEscrow } from "../target/types/solana_escrow";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("solana_escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaEscrow as Program<SolanaEscrow>;

  const initializer = Keypair.generate();
  // Replace this with your actual wallet address where you want to receive fees
  const feeCollectorAddress = new PublicKey("67c89e9AaAnXavrXBEi4C25spybND1KxvxVb4nK1Z6Hn"); // <- Put your wallet address here
  const winner = Keypair.generate();

  // Generate a new keypair for the escrow account
  const escrowAccount = Keypair.generate();
  let escrowVaultPda: PublicKey;
  let vaultBump: number;

  before(async () => {
    const connection = anchor.getProvider().connection;

    console.log("=== SETUP INFORMATION ===");
    console.log("Program ID from workspace:", program.programId.toString());
    console.log("Cluster endpoint:", connection.rpcEndpoint);
    
    // Check if program exists on the current cluster
    try {
      const programAccount = await connection.getAccountInfo(program.programId);
      if (!programAccount) {
        console.error("❌ Program account not found!");
        console.log("Expected program ID:", program.programId.toString());
        
        // Try to get the actual deployed program ID
        try {
          const fs = require('fs');
          const keypairPath = 'target/deploy/solana_escrow-keypair.json';
          if (fs.existsSync(keypairPath)) {
            const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
            const actualProgramId = Keypair.fromSecretKey(new Uint8Array(keypairData)).publicKey;
            console.log("Actual deployed program ID:", actualProgramId.toString());
            
            if (!actualProgramId.equals(program.programId)) {
              console.error("❌ PROGRAM ID MISMATCH!");
              console.log("Update your lib.rs declare_id! to:", actualProgramId.toString());
            }
          }
        } catch (e) {
          console.log("Could not read keypair file:", e.message);
        }
        
        throw new Error(`Program ${program.programId.toString()} does not exist. Make sure program IDs match and deployment was successful.`);
      }
      console.log("✅ Program found on cluster");
      console.log("Program account owner:", programAccount.owner.toString());
      console.log("Program account executable:", programAccount.executable);
    } catch (error) {
      console.error("❌ Program check failed:", error.message);
      throw error;
    }

    // Check balances before airdrop
    console.log("=== AIRDROP PHASE ===");
    const initBalance = await connection.getBalance(initializer.publicKey);
    const winnerBalance = await connection.getBalance(winner.publicKey);
    const feeCollectorBalance = await connection.getBalance(feeCollectorAddress);
    console.log("Initializer balance before airdrop:", initBalance);
    console.log("Winner balance before airdrop:", winnerBalance);
    console.log("Fee collector balance:", feeCollectorBalance);

    // Airdrop SOL to initializer
    console.log("Requesting airdrop for initializer...");
    const airdropSig1 = await connection.requestAirdrop(initializer.publicKey, 10 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction({
      signature: airdropSig1,
      blockhash: (await connection.getLatestBlockhash()).blockhash,
      lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
    });

    // Airdrop SOL to winner
    console.log("Requesting airdrop for winner...");
    const airdropSig2 = await connection.requestAirdrop(winner.publicKey, 10 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction({
      signature: airdropSig2,
      blockhash: (await connection.getLatestBlockhash()).blockhash,
      lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
    });

    // Note: No airdrop needed for fee collector since it's your existing wallet

    // Find PDA for escrow_vault
    [escrowVaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowAccount.publicKey.toBuffer()],
      program.programId
    );

    console.log("=== ACCOUNT INFORMATION ===");
    console.log("Escrow account:", escrowAccount.publicKey.toString());
    console.log("Escrow vault PDA:", escrowVaultPda.toString());
    console.log("Vault bump:", vaultBump);
    console.log("Initializer:", initializer.publicKey.toString());
    console.log("Fee collector (YOUR WALLET):", feeCollectorAddress.toString());
    console.log("Winner:", winner.publicKey.toString());
    console.log("=========================");
  });

  it("Initializes the escrow", async () => {
    try {
      await program.methods
        .initialize(new anchor.BN(LAMPORTS_PER_SOL)) // amount = 1 SOL
        .accounts({
          escrow: escrowAccount.publicKey,
          initializer: initializer.publicKey,
          feeCollector: feeCollectorAddress, // Using your specific wallet address
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([initializer, escrowAccount]) // Include escrowAccount as signer
        .rpc();

      const escrowAccountData = await program.account.escrowAccount.fetch(escrowAccount.publicKey);
      assert.equal(escrowAccountData.initializer.toString(), initializer.publicKey.toString());
      assert.equal(escrowAccountData.amount.toNumber(), LAMPORTS_PER_SOL);
      assert.equal(escrowAccountData.feeCollector.toString(), feeCollectorAddress.toString());
      
      console.log("✅ Escrow initialized successfully");
    } catch (error) {
      console.error("Initialize error:", error);
      throw error;
    }
  });

  it("Deposits to the escrow", async () => {
    try {
      const initialVaultBalance = await anchor.getProvider().connection.getBalance(escrowVaultPda);
      const initialInitializerBalance = await anchor.getProvider().connection.getBalance(initializer.publicKey);

      console.log("Initial vault balance:", initialVaultBalance);
      console.log("Initial initializer balance:", initialInitializerBalance);

      await program.methods
        .deposit(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          escrow: escrowAccount.publicKey,
          initializer: initializer.publicKey,
          escrowVault: escrowVaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([initializer])
        .rpc();

      const finalVaultBalance = await anchor.getProvider().connection.getBalance(escrowVaultPda);
      const finalInitializerBalance = await anchor.getProvider().connection.getBalance(initializer.publicKey);

      console.log("Final vault balance:", finalVaultBalance);
      console.log("Final initializer balance:", finalInitializerBalance);

      // Check vault received the deposit
      assert.equal(finalVaultBalance - initialVaultBalance, LAMPORTS_PER_SOL);
      
      // Check initializer lost approximately 1 SOL + transaction fees
      const balanceDiff = initialInitializerBalance - finalInitializerBalance;
      assert.isTrue(balanceDiff >= LAMPORTS_PER_SOL, "Initializer should have lost at least 1 SOL");
      assert.isTrue(balanceDiff < LAMPORTS_PER_SOL + 0.01 * LAMPORTS_PER_SOL, "Should not lose more than 1.01 SOL (accounting for fees)");
      
      console.log("✅ Deposit successful");
    } catch (error) {
      console.error("Deposit error:", error);
      throw error;
    }
  });

  it("Releases the pot with fee", async () => {
    try {
      const initialFeeBalance = await anchor.getProvider().connection.getBalance(feeCollectorAddress);
      const initialWinnerBalance = await anchor.getProvider().connection.getBalance(winner.publicKey);
      const initialVaultBalance = await anchor.getProvider().connection.getBalance(escrowVaultPda);

      console.log("Before release:");
      console.log("- Vault balance:", initialVaultBalance);
      console.log("- Fee collector balance:", initialFeeBalance);
      console.log("- Winner balance:", initialWinnerBalance);

      await program.methods
        .release()
        .accounts({
          escrow: escrowAccount.publicKey,
          escrowVault: escrowVaultPda,
          winner: winner.publicKey,
          feeCollector: feeCollectorAddress, // Using your specific wallet address
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([winner])
        .rpc();

      const finalFeeBalance = await anchor.getProvider().connection.getBalance(feeCollectorAddress);
      const finalWinnerBalance = await anchor.getProvider().connection.getBalance(winner.publicKey);
      const finalVaultBalance = await anchor.getProvider().connection.getBalance(escrowVaultPda);

      console.log("After release:");
      console.log("- Vault balance:", finalVaultBalance);
      console.log("- Fee collector balance:", finalFeeBalance);
      console.log("- Winner balance:", finalWinnerBalance);

      const expectedFee = Math.floor(initialVaultBalance / 100);
      const expectedWinnerAmount = initialVaultBalance - expectedFee;

      console.log("Expected fee:", expectedFee);
      console.log("Expected winner amount:", expectedWinnerAmount);
      console.log("Actual fee collected:", finalFeeBalance - initialFeeBalance);

      // Check fee collector received the fee
      assert.equal(finalFeeBalance - initialFeeBalance, expectedFee, "Fee collector should receive 1% fee");
      
      // Check winner received the remaining amount (accounting for transaction fees)
      const winnerAmountReceived = finalWinnerBalance - initialWinnerBalance;
      // Winner pays tx fees, so they get slightly less than expected
      assert.isTrue(winnerAmountReceived >= expectedWinnerAmount - 0.01 * LAMPORTS_PER_SOL, "Winner should receive approximately 99% minus tx fees");
      
      // Check vault is empty
      assert.equal(finalVaultBalance, 0, "Vault should be empty after release");
      
      console.log("✅ Release with fee successful");
    } catch (error) {
      console.error("Release error:", error);
      throw error;
    }
  });

  it("Can cancel escrow and refund initializer", async () => {
    try {
      // Create a new escrow for cancellation test
      const newEscrowAccount = Keypair.generate();
      const [newVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), newEscrowAccount.publicKey.toBuffer()],
        program.programId
      );

      // Initialize new escrow
      await program.methods
        .initialize(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          escrow: newEscrowAccount.publicKey,
          initializer: initializer.publicKey,
          feeCollector: feeCollectorAddress, // Using your specific wallet address
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([initializer, newEscrowAccount])
        .rpc();

      // Deposit to new escrow
      await program.methods
        .deposit(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          escrow: newEscrowAccount.publicKey,
          initializer: initializer.publicKey,
          escrowVault: newVaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([initializer])
        .rpc();

      const initialInitializerBalance = await anchor.getProvider().connection.getBalance(initializer.publicKey);
      const initialVaultBalance = await anchor.getProvider().connection.getBalance(newVaultPda);

      console.log("Before cancel:");
      console.log("- Vault balance:", initialVaultBalance);
      console.log("- Initializer balance:", initialInitializerBalance);

      // Cancel the escrow
      await program.methods
        .cancel()
        .accounts({
          escrow: newEscrowAccount.publicKey,
          initializer: initializer.publicKey,
          escrowVault: newVaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([initializer])
        .rpc();

      const finalInitializerBalance = await anchor.getProvider().connection.getBalance(initializer.publicKey);
      const finalVaultBalance = await anchor.getProvider().connection.getBalance(newVaultPda);

      console.log("After cancel:");
      console.log("- Vault balance:", finalVaultBalance);
      console.log("- Initializer balance:", finalInitializerBalance);

      // Check initializer got refund (minus transaction fees)
      const refundReceived = finalInitializerBalance - initialInitializerBalance;
      assert.isTrue(refundReceived >= initialVaultBalance - 0.01 * LAMPORTS_PER_SOL, "Initializer should receive refund minus tx fees");
      
      // Check vault is empty
      assert.equal(finalVaultBalance, 0, "Vault should be empty after cancel");
      
      console.log("✅ Cancel and refund successful");
    } catch (error) {
      console.error("Cancel error:", error);
      throw error;
    }
  });
});