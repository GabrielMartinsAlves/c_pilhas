#!/usr/bin/env node

/**
 * Master Security Verification Script
 * Orchestrates all security checks and generates comprehensive reports
 */

const SecurityReportGenerator = require('./security-report');

async function main() {
    console.log('🛡️  RPN Calculator Security Verification System');
    console.log('================================================\n');
    
    const generator = new SecurityReportGenerator();
    await generator.run();
    
    process.exit(0);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled error:', error.message);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error.message);
    process.exit(1);
});

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Security verification failed:', error.message);
        process.exit(1);
    });
}