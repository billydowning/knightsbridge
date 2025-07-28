const { Connection } = require('@solana/web3.js');

async function checkTransaction(txHash) {
  const connection = new Connection('https://api.devnet.solana.com');
  
  console.log('🔍 Checking transaction:', txHash);
  
  try {
    // Get transaction details
    const tx = await connection.getTransaction(txHash, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });
    
    if (!tx) {
      console.log('❌ Transaction not found');
      return;
    }
    
    console.log('✅ Transaction found!');
    console.log('📊 Slot:', tx.slot);
    console.log('📊 Block time:', new Date(tx.blockTime * 1000).toISOString());
    console.log('📊 Fee:', tx.meta.fee, 'lamports');
    console.log('📊 Success:', tx.meta.err ? '❌ FAILED' : '✅ SUCCESS');
    
    if (tx.meta.err) {
      console.log('❌ Error:', JSON.stringify(tx.meta.err, null, 2));
    }
    
    console.log('\n🔍 PROGRAM LOGS:');
    console.log('===============');
    if (tx.meta.logMessages) {
      tx.meta.logMessages.forEach((log, i) => {
        console.log(`${i + 1}: ${log}`);
      });
    }
    
    console.log('\n📋 INSTRUCTIONS:');
    console.log('================');
    if (tx.transaction.message.instructions) {
      tx.transaction.message.instructions.forEach((ix, i) => {
        console.log(`Instruction ${i + 1}:`);
        console.log(`  Program Index: ${ix.programIdIndex}`);
        console.log(`  Accounts: ${ix.accounts.join(', ')}`);
        console.log(`  Data: ${Buffer.from(ix.data, 'base64').toString('hex')}`);
      });
    }
    
    console.log('\n🎯 ANALYSIS:');
    console.log('============');
    
    if (tx.meta.err) {
      console.log('❌ Transaction failed - this explains why on-chain state wasn\'t updated');
    } else {
      console.log('✅ Transaction succeeded');
      
      // Check for program errors in logs
      const hasError = tx.meta.logMessages?.some(log => 
        log.includes('Error') || log.includes('failed') || log.includes('custom program error')
      );
      
      if (hasError) {
        console.log('⚠️  But program logs show errors - instruction may have failed');
      } else {
        console.log('✅ No errors in program logs - instruction should have succeeded');
      }
    }
    
  } catch (error) {
    console.error('❌ Error fetching transaction:', error.message);
  }
}

// Get transaction hash from command line
const txHash = process.argv[2];
if (!txHash) {
  console.log('Usage: node check-transaction.js TRANSACTION_HASH');
  console.log('Example: node check-transaction.js 5cXtGfAPkGrT4ZwV6tsHyK4eD5cqcsfS4BnVjNcqw3v4URhXwLmypaey4ffof1YNubZGLejZDwsXKLoBNsbV9neH');
  process.exit(1);
}

checkTransaction(txHash); 