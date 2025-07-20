import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ChessEscrow } from "../target/types/chess_escrow";
import { assert } from "chai";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("chess_escrow", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ChessEscrow as Program<ChessEscrow>;
  
  // Test accounts
  let playerWhite: Keypair;
  let playerBlack: Keypair;
  let feeCollector: Keypair;
  let unauthorizedPlayer: Keypair;
  
  // Test data
  const roomId = "test-room-123";
  const stakeAmount = new anchor.BN(LAMPORTS_PER_SOL); // 1 SOL
  const timeLimitSeconds = new anchor.BN(300); // 5 minutes
  
  // PDAs
  let gameEscrowPda: PublicKey;
  let gameVaultPda: PublicKey;
  let gameEscrowBump: number;
  let gameVaultBump: number;

  before(async () => {
    // Create test keypairs
    playerWhite = Keypair.generate();
    playerBlack = Keypair.generate();
    feeCollector = Keypair.generate();
    unauthorizedPlayer = Keypair.generate();
    
  // Airdrop SOL to test accounts
    const airdropAmount = 100 * LAMPORTS_PER_SOL; // Increase airdrop amount
    await provider.connection.requestAirdrop(playerWhite.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(playerBlack.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(unauthorizedPlayer.publicKey, airdropAmount);
    
    // Wait for airdrops to confirm
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Derive PDAs
    [gameEscrowPda, gameEscrowBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("game"), Buffer.from(roomId)],
      program.programId
    );
    
    [gameVaultPda, gameVaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), gameEscrowPda.toBuffer()],
      program.programId
    );
  });

  describe("initialize_game", () => {
    it("should initialize a new game", async () => {
      const tx = await program.methods
        .initializeGame(roomId, stakeAmount, timeLimitSeconds)
        .accounts({
          gameEscrow: gameEscrowPda,
          player: playerWhite.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
      
      // Fetch the created game escrow account
      const gameEscrow = await program.account.gameEscrow.fetch(gameEscrowPda);
      
      assert.equal(gameEscrow.roomId, roomId);
      assert.equal(gameEscrow.playerWhite.toString(), playerWhite.publicKey.toString());
      assert.equal(gameEscrow.playerBlack.toString(), PublicKey.default.toString());
      assert.equal(gameEscrow.stakeAmount.toString(), stakeAmount.toString());
      assert.equal(gameEscrow.totalDeposited.toString(), "0");
      assert.deepEqual(gameEscrow.gameState, { waitingForPlayers: {} });
      assert.deepEqual(gameEscrow.winner, { none: {} });
      assert.equal(gameEscrow.timeLimitSeconds.toString(), timeLimitSeconds.toString());
      assert.equal(gameEscrow.feeCollector.toString(), feeCollector.publicKey.toString());
      assert.equal(gameEscrow.whiteDeposited, false);
      assert.equal(gameEscrow.blackDeposited, false);
      assert.equal(gameEscrow.moveCount, 0);
    });

    it("should fail if room ID is too long", async () => {
      const longRoomId = "a".repeat(33);
      
      try {
        // Try to derive PDA with long room ID - this will fail
        const [longGameEscrowPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("game"), Buffer.from(longRoomId)],
          program.programId
        );
        
        // If we get here, try to initialize (though we shouldn't get here)
        await program.methods
          .initializeGame(longRoomId, stakeAmount, timeLimitSeconds)
          .accounts({
            gameEscrow: longGameEscrowPda,
            player: playerWhite.publicKey,
            feeCollector: feeCollector.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([playerWhite])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        // The error will be about max seed length exceeded, not RoomIdTooLong
        // because the validation happens at PDA level
        assert(error.toString().includes("Max seed length exceeded") || 
               error.toString().includes("RoomIdTooLong"),
               `Expected seed length or room ID error, got: ${error.toString()}`);
      }
    });

    it("should fail if stake amount is zero", async () => {
      const zeroStake = new anchor.BN(0);
      const newRoomId = "test-room-zero";
      const [newGameEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(newRoomId)],
        program.programId
      );
      
      try {
        await program.methods
          .initializeGame(newRoomId, zeroStake, timeLimitSeconds)
          .accounts({
            gameEscrow: newGameEscrowPda,
            player: playerWhite.publicKey,
            feeCollector: feeCollector.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([playerWhite])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.toString(), "InvalidStakeAmount");
      }
    });
  });

  describe("join_game", () => {
    it("should allow a second player to join", async () => {
      const tx = await program.methods
        .joinGame()
        .accounts({
          gameEscrow: gameEscrowPda,
          player: playerBlack.publicKey,
        })
        .signers([playerBlack])
        .rpc();
      
      const gameEscrow = await program.account.gameEscrow.fetch(gameEscrowPda);
      
      assert.equal(gameEscrow.playerBlack.toString(), playerBlack.publicKey.toString());
      assert.deepEqual(gameEscrow.gameState, { waitingForDeposits: {} });
    });

    it("should fail if player tries to play against themselves", async () => {
      const selfPlayRoomId = "self-play-room";
      const [selfPlayGameEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(selfPlayRoomId)],
        program.programId
      );
      
      // Initialize a new game
      await program.methods
        .initializeGame(selfPlayRoomId, stakeAmount, timeLimitSeconds)
        .accounts({
          gameEscrow: selfPlayGameEscrowPda,
          player: playerWhite.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
      
      // Try to join the same game
      try {
        await program.methods
          .joinGame()
          .accounts({
            gameEscrow: selfPlayGameEscrowPda,
            player: playerWhite.publicKey,
          })
          .signers([playerWhite])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.toString(), "CannotPlayAgainstSelf");
      }
    });
  });

  describe("deposit_stake", () => {
    // Create a new game for deposit tests to avoid state conflicts
    let depositRoomId: string;
    let depositGameEscrowPda: PublicKey;
    let depositGameVaultPda: PublicKey;
    
    beforeEach(async () => {
      depositRoomId = `deposit-test-${Date.now()}`;
      [depositGameEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(depositRoomId)],
        program.programId
      );
      [depositGameVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), depositGameEscrowPda.toBuffer()],
        program.programId
      );
      
      // Initialize a fresh game
      await program.methods
        .initializeGame(depositRoomId, stakeAmount, timeLimitSeconds)
        .accounts({
          gameEscrow: depositGameEscrowPda,
          player: playerWhite.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
        
      // Player black joins
      await program.methods
        .joinGame()
        .accounts({
          gameEscrow: depositGameEscrowPda,
          player: playerBlack.publicKey,
        })
        .signers([playerBlack])
        .rpc();
    });

    it("should allow white player to deposit stake", async () => {
      const vaultBalanceBefore = await provider.connection.getBalance(depositGameVaultPda);
      
      const tx = await program.methods
        .depositStake()
        .accounts({
          gameEscrow: depositGameEscrowPda,
          player: playerWhite.publicKey,
          gameVault: depositGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
      
      const gameEscrow = await program.account.gameEscrow.fetch(depositGameEscrowPda);
      const vaultBalanceAfter = await provider.connection.getBalance(depositGameVaultPda);
      
      assert.equal(gameEscrow.whiteDeposited, true);
      assert.equal(gameEscrow.totalDeposited.toString(), stakeAmount.toString());
      assert.equal(vaultBalanceAfter - vaultBalanceBefore, stakeAmount.toNumber());
    });

    it("should allow black player to deposit stake and start game", async () => {
      // White deposits first
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: depositGameEscrowPda,
          player: playerWhite.publicKey,
          gameVault: depositGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
        
      const tx = await program.methods
        .depositStake()
        .accounts({
          gameEscrow: depositGameEscrowPda,
          player: playerBlack.publicKey,
          gameVault: depositGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerBlack])
        .rpc();
      
      const gameEscrow = await program.account.gameEscrow.fetch(depositGameEscrowPda);
      
      assert.equal(gameEscrow.blackDeposited, true);
      assert.equal(gameEscrow.totalDeposited.toString(), (stakeAmount.toNumber() * 2).toString());
      assert.deepEqual(gameEscrow.gameState, { inProgress: {} });
      assert.notEqual(gameEscrow.startedAt.toString(), "0");
      assert.notEqual(gameEscrow.lastMoveTime.toString(), "0");
    });

    it("should fail if player deposits twice", async () => {
      // White deposits first
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: depositGameEscrowPda,
          player: playerWhite.publicKey,
          gameVault: depositGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
        
      try {
        await program.methods
          .depositStake()
          .accounts({
            gameEscrow: depositGameEscrowPda,
            player: playerWhite.publicKey,
            gameVault: depositGameVaultPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([playerWhite])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.toString(), "AlreadyDeposited");
      }
    });

    it("should fail if unauthorized player tries to deposit", async () => {
      try {
        await program.methods
          .depositStake()
          .accounts({
            gameEscrow: depositGameEscrowPda,
            player: unauthorizedPlayer.publicKey,
            gameVault: depositGameVaultPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorizedPlayer])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.toString(), "UnauthorizedPlayer");
      }
    });
  });

  describe("record_move", () => {
    const moveNotation = "e2e4";
    const gamePositionHash = Array(32).fill(1);
    let moveRoomId: string;
    let moveGameEscrowPda: PublicKey;
    let moveGameVaultPda: PublicKey;
    
    beforeEach(async () => {
      // Create and start a fresh game for move tests
      moveRoomId = `move-test-${Date.now()}`;
      [moveGameEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(moveRoomId)],
        program.programId
      );
      [moveGameVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), moveGameEscrowPda.toBuffer()],
        program.programId
      );
      
      // Initialize and fully start the game
      await program.methods
        .initializeGame(moveRoomId, stakeAmount, timeLimitSeconds)
        .accounts({
          gameEscrow: moveGameEscrowPda,
          player: playerWhite.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
        
      await program.methods
        .joinGame()
        .accounts({
          gameEscrow: moveGameEscrowPda,
          player: playerBlack.publicKey,
        })
        .signers([playerBlack])
        .rpc();
        
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: moveGameEscrowPda,
          player: playerWhite.publicKey,
          gameVault: moveGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
        
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: moveGameEscrowPda,
          player: playerBlack.publicKey,
          gameVault: moveGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerBlack])
        .rpc();
    });

    it("should record a move", async () => {
      const tx = await program.methods
        .recordMove(moveNotation, gamePositionHash)
        .accounts({
          gameEscrow: moveGameEscrowPda,
          player: playerWhite.publicKey,
        })
        .signers([playerWhite])
        .rpc();
      
      const gameEscrow = await program.account.gameEscrow.fetch(moveGameEscrowPda);
      
      assert.equal(gameEscrow.moveCount, 1);
    });

    it("should fail if game is not in progress", async () => {
      // Create a new game that's not started
      const notStartedRoomId = "not-started-room";
      const [notStartedGameEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(notStartedRoomId)],
        program.programId
      );
      
      await program.methods
        .initializeGame(notStartedRoomId, stakeAmount, timeLimitSeconds)
        .accounts({
          gameEscrow: notStartedGameEscrowPda,
          player: playerWhite.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
      
      try {
        await program.methods
          .recordMove(moveNotation, gamePositionHash)
          .accounts({
            gameEscrow: notStartedGameEscrowPda,
            player: playerWhite.publicKey,
          })
          .signers([playerWhite])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.toString(), "GameNotInProgress");
      }
    });

    it("should fail if unauthorized player tries to record move", async () => {
      try {
        await program.methods
          .recordMove(moveNotation, gamePositionHash)
          .accounts({
            gameEscrow: moveGameEscrowPda,
            player: unauthorizedPlayer.publicKey,
          })
          .signers([unauthorizedPlayer])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.toString(), "UnauthorizedPlayer");
      }
    });
  });

  describe("declare_result", () => {
    let resultRoomId: string;
    let resultGameEscrowPda: PublicKey;
    let resultGameVaultPda: PublicKey;
    
    beforeEach(async () => {
      // Create a fresh game for each result test
      resultRoomId = `result-test-${Date.now()}`;
      [resultGameEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(resultRoomId)],
        program.programId
      );
      [resultGameVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), resultGameEscrowPda.toBuffer()],
        program.programId
      );
      
      // Initialize and start game
      await program.methods
        .initializeGame(resultRoomId, stakeAmount, timeLimitSeconds)
        .accounts({
          gameEscrow: resultGameEscrowPda,
          player: playerWhite.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
        
      await program.methods
        .joinGame()
        .accounts({
          gameEscrow: resultGameEscrowPda,
          player: playerBlack.publicKey,
        })
        .signers([playerBlack])
        .rpc();
        
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: resultGameEscrowPda,
          player: playerWhite.publicKey,
          gameVault: resultGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
        
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: resultGameEscrowPda,
          player: playerBlack.publicKey,
          gameVault: resultGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerBlack])
        .rpc();
    });
    
    it("should handle resignation by black player (white wins)", async () => {
      const vaultBalanceBefore = await provider.connection.getBalance(resultGameVaultPda);
      const whiteBalanceBefore = await provider.connection.getBalance(playerWhite.publicKey);
      const feeCollectorBalanceBefore = await provider.connection.getBalance(feeCollector.publicKey);
      
      const tx = await program.methods
        .declareResult(
          { white: {} },  // GameWinner::White
          { resignation: {} }  // GameEndReason::Resignation
        )
        .accounts({
          gameEscrow: resultGameEscrowPda,
          player: playerBlack.publicKey,
          gameVault: resultGameVaultPda,
          playerWhite: playerWhite.publicKey,
          playerBlack: playerBlack.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerBlack])
        .rpc();
      
      const gameEscrow = await program.account.gameEscrow.fetch(resultGameEscrowPda);
      const vaultBalanceAfter = await provider.connection.getBalance(resultGameVaultPda);
      const whiteBalanceAfter = await provider.connection.getBalance(playerWhite.publicKey);
      const feeCollectorBalanceAfter = await provider.connection.getBalance(feeCollector.publicKey);
      
      assert.deepEqual(gameEscrow.winner, { white: {} });
      assert.deepEqual(gameEscrow.gameState, { finished: {} });
      assert.notEqual(gameEscrow.finishedAt.toString(), "0");
      
      // Check fund distribution (1% fee)
      const totalStake = stakeAmount.toNumber() * 2;
      const feeAmount = Math.floor(totalStake * 0.01);
      const winnerAmount = totalStake - feeAmount;
      
      assert.equal(vaultBalanceAfter, 0);
      assert.equal(whiteBalanceAfter - whiteBalanceBefore, winnerAmount);
      assert.equal(feeCollectorBalanceAfter - feeCollectorBalanceBefore, feeAmount);
    });
  });

  describe("handle_timeout", () => {
    let timeoutRoomId: string;
    let timeoutGameEscrowPda: PublicKey;
    let timeoutGameVaultPda: PublicKey;

    before(async () => {
      // Create a new game with very short time limit for testing timeout
      timeoutRoomId = "timeout-test-room";
      const shortTimeLimit = new anchor.BN(1); // 1 second
      
      [timeoutGameEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(timeoutRoomId)],
        program.programId
      );
      
      [timeoutGameVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), timeoutGameEscrowPda.toBuffer()],
        program.programId
      );
      
      // Initialize game
      await program.methods
        .initializeGame(timeoutRoomId, stakeAmount, shortTimeLimit)
        .accounts({
          gameEscrow: timeoutGameEscrowPda,
          player: playerWhite.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
      
      // Player black joins
      await program.methods
        .joinGame()
        .accounts({
          gameEscrow: timeoutGameEscrowPda,
          player: playerBlack.publicKey,
        })
        .signers([playerBlack])
        .rpc();
      
      // Both players deposit
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: timeoutGameEscrowPda,
          player: playerWhite.publicKey,
          gameVault: timeoutGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
      
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: timeoutGameEscrowPda,
          player: playerBlack.publicKey,
          gameVault: timeoutGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerBlack])
        .rpc();
      
      // Wait for timeout (adding extra time to ensure it's exceeded)
      await new Promise(resolve => setTimeout(resolve, 3000));
    });

    it("should handle timeout correctly", async () => {
      const tx = await program.methods
        .handleTimeout()
        .accounts({
          gameEscrow: timeoutGameEscrowPda,
          gameVault: timeoutGameVaultPda,
          playerWhite: playerWhite.publicKey,
          playerBlack: playerBlack.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      const gameEscrow = await program.account.gameEscrow.fetch(timeoutGameEscrowPda);
      
      assert.deepEqual(gameEscrow.gameState, { finished: {} });
      // Since move_count is 0 (even), it's white's turn, so black wins on timeout
      assert.deepEqual(gameEscrow.winner, { black: {} });
    });
  });

  describe("cancel_game", () => {
    let cancelRoomId: string;
    let cancelGameEscrowPda: PublicKey;
    let cancelGameVaultPda: PublicKey;

    before(async () => {
      cancelRoomId = "cancel-test-room";
      
      [cancelGameEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(cancelRoomId)],
        program.programId
      );
      
      [cancelGameVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), cancelGameEscrowPda.toBuffer()],
        program.programId
      );
      
      // Initialize game
      await program.methods
        .initializeGame(cancelRoomId, stakeAmount, timeLimitSeconds)
        .accounts({
          gameEscrow: cancelGameEscrowPda,
          player: playerWhite.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
      
      // White deposits
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: cancelGameEscrowPda,
          player: playerWhite.publicKey,
          gameVault: cancelGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
    });

  describe("cancel_game", () => {
    it("should allow cancelling game before it starts", async () => {
      // Create a new room with a black player who joins but doesn't deposit
      const cancelWithBlackRoomId = `cancel-black-${Date.now()}`;
      const [cancelWithBlackGameEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(cancelWithBlackRoomId)],
        program.programId
      );
      const [cancelWithBlackGameVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), cancelWithBlackGameEscrowPda.toBuffer()],
        program.programId
      );
      
      // Initialize game
      await program.methods
        .initializeGame(cancelWithBlackRoomId, stakeAmount, timeLimitSeconds)
        .accounts({
          gameEscrow: cancelWithBlackGameEscrowPda,
          player: playerWhite.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
      
      // Black player joins
      await program.methods
        .joinGame()
        .accounts({
          gameEscrow: cancelWithBlackGameEscrowPda,
          player: playerBlack.publicKey,
        })
        .signers([playerBlack])
        .rpc();
      
      // White deposits
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: cancelWithBlackGameEscrowPda,
          player: playerWhite.publicKey,
          gameVault: cancelWithBlackGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
      
      const whiteBalanceBefore = await provider.connection.getBalance(playerWhite.publicKey);
      
      // Now cancel (game is in WaitingForDeposits state)
      const tx = await program.methods
        .cancelGame()
        .accounts({
          gameEscrow: cancelWithBlackGameEscrowPda,
          player: playerWhite.publicKey,
          gameVault: cancelWithBlackGameVaultPda,
          playerWhite: playerWhite.publicKey,
          playerBlack: playerBlack.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
      
      const gameEscrowAfter = await program.account.gameEscrow.fetch(cancelWithBlackGameEscrowPda);
      const whiteBalanceAfter = await provider.connection.getBalance(playerWhite.publicKey);
      
      assert.deepEqual(gameEscrowAfter.gameState, { cancelled: {} });
      // Check refund (minus transaction fees)
      assert.approximately(
        whiteBalanceAfter - whiteBalanceBefore,
        stakeAmount.toNumber(),
        10000000 // Allow for transaction fees
      );
    });

    it("should fail to cancel a game in progress", async () => {
      // Create and start a new game
      const inProgressRoomId = `in-progress-${Date.now()}`;
      const [inProgressGameEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(inProgressRoomId)],
        program.programId
      );
      const [inProgressGameVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), inProgressGameEscrowPda.toBuffer()],
        program.programId
      );
      
      // Initialize and start the game
      await program.methods
        .initializeGame(inProgressRoomId, stakeAmount, timeLimitSeconds)
        .accounts({
          gameEscrow: inProgressGameEscrowPda,
          player: playerWhite.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
        
      await program.methods
        .joinGame()
        .accounts({
          gameEscrow: inProgressGameEscrowPda,
          player: playerBlack.publicKey,
        })
        .signers([playerBlack])
        .rpc();
        
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: inProgressGameEscrowPda,
          player: playerWhite.publicKey,
          gameVault: inProgressGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
        
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: inProgressGameEscrowPda,
          player: playerBlack.publicKey,
          gameVault: inProgressGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerBlack])
        .rpc();
      
      // Now try to cancel the in-progress game
      try {
        await program.methods
          .cancelGame()
          .accounts({
            gameEscrow: inProgressGameEscrowPda,
            player: playerWhite.publicKey,
            gameVault: inProgressGameVaultPda,
            playerWhite: playerWhite.publicKey,
            playerBlack: playerBlack.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([playerWhite])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.toString(), "CannotCancelStartedGame");
      }
    });
  });
  });

  describe("edge cases and security", () => {
    it("should validate move notation length", async () => {
      const longMoveNotation = "a".repeat(11);
      const gamePositionHash = Array(32).fill(1);
      
      // Create a new game for this test
      const edgeRoomId = "edge-case-room";
      const [edgeGameEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(edgeRoomId)],
        program.programId
      );
      const [edgeGameVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), edgeGameEscrowPda.toBuffer()],
        program.programId
      );
      
      // Set up the game
      await program.methods
        .initializeGame(edgeRoomId, stakeAmount, timeLimitSeconds)
        .accounts({
          gameEscrow: edgeGameEscrowPda,
          player: playerWhite.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
      
      await program.methods
        .joinGame()
        .accounts({
          gameEscrow: edgeGameEscrowPda,
          player: playerBlack.publicKey,
        })
        .signers([playerBlack])
        .rpc();
      
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: edgeGameEscrowPda,
          player: playerWhite.publicKey,
          gameVault: edgeGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerWhite])
        .rpc();
      
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: edgeGameEscrowPda,
          player: playerBlack.publicKey,
          gameVault: edgeGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([playerBlack])
        .rpc();
      
      try {
        await program.methods
          .recordMove(longMoveNotation, gamePositionHash)
          .accounts({
            gameEscrow: edgeGameEscrowPda,
            player: playerWhite.publicKey,
          })
          .signers([playerWhite])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.toString(), "MoveNotationTooLong");
      }
    });

    it("should handle draw by agreement", async () => {
      // Create a new game for draw test
      const drawRoomId = "draw-test-room";
      const [drawGameEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(drawRoomId)],
        program.programId
      );
      const [drawGameVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), drawGameEscrowPda.toBuffer()],
        program.programId
      );
      
      // Create fresh keypairs with sufficient balance for this test
      const drawPlayerWhite = Keypair.generate();
      const drawPlayerBlack = Keypair.generate();
      
      // Airdrop SOL to the draw test players
      await provider.connection.requestAirdrop(drawPlayerWhite.publicKey, 10 * LAMPORTS_PER_SOL);
      await provider.connection.requestAirdrop(drawPlayerBlack.publicKey, 10 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Set up the game
      await program.methods
        .initializeGame(drawRoomId, stakeAmount, timeLimitSeconds)
        .accounts({
          gameEscrow: drawGameEscrowPda,
          player: drawPlayerWhite.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([drawPlayerWhite])
        .rpc();
      
      await program.methods
        .joinGame()
        .accounts({
          gameEscrow: drawGameEscrowPda,
          player: drawPlayerBlack.publicKey,
        })
        .signers([drawPlayerBlack])
        .rpc();
      
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: drawGameEscrowPda,
          player: drawPlayerWhite.publicKey,
          gameVault: drawGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([drawPlayerWhite])
        .rpc();
      
      await program.methods
        .depositStake()
        .accounts({
          gameEscrow: drawGameEscrowPda,
          player: drawPlayerBlack.publicKey,
          gameVault: drawGameVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([drawPlayerBlack])
        .rpc();
      
      const whiteBalanceBefore = await provider.connection.getBalance(drawPlayerWhite.publicKey);
      const blackBalanceBefore = await provider.connection.getBalance(drawPlayerBlack.publicKey);
      
      // Declare draw
      await program.methods
        .declareResult(
          { draw: {} },  // GameWinner::Draw
          { agreement: {} }  // GameEndReason::Agreement
        )
        .accounts({
          gameEscrow: drawGameEscrowPda,
          player: drawPlayerWhite.publicKey,
          gameVault: drawGameVaultPda,
          playerWhite: drawPlayerWhite.publicKey,
          playerBlack: drawPlayerBlack.publicKey,
          feeCollector: feeCollector.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([drawPlayerWhite])
        .rpc();
      
      const gameEscrow = await program.account.gameEscrow.fetch(drawGameEscrowPda);
      const whiteBalanceAfter = await provider.connection.getBalance(drawPlayerWhite.publicKey);
      const blackBalanceAfter = await provider.connection.getBalance(drawPlayerBlack.publicKey);
      
      assert.deepEqual(gameEscrow.winner, { draw: {} });
      
      // Check that both players received approximately half of the pot (minus fees)
      const totalStake = stakeAmount.toNumber() * 2;
      const feeAmount = Math.floor(totalStake * 0.01);
      const remainingAmount = totalStake - feeAmount;
      const halfAmount = Math.floor(remainingAmount / 2);
      
      assert.approximately(
        whiteBalanceAfter - whiteBalanceBefore,
        halfAmount,
        5000000 // Allow for transaction fees
      );
      assert.approximately(
        blackBalanceAfter - blackBalanceBefore,
        halfAmount,
        5000000 // Allow for transaction fees
      );
    });
  });
});