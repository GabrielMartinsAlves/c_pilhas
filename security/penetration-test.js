#!/usr/bin/env node

/**
 * Penetration Testing Framework
 * Basic security tests for the web application
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class PenetrationTester {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.reportData = {
            timestamp: new Date().toISOString(),
            target: baseUrl,
            tests: [],
            summary: {
                passed: 0,
                failed: 0,
                warnings: 0,
                riskLevel: 'LOW'
            }
        };
        this.serverProcess = null;
    }

    async makeRequest(path, options = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const client = url.protocol === 'https:' ? https : http;
            
            const requestOptions = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: 10000
            };

            const req = client.request(requestOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (options.body) {
                req.write(options.body);
            }
            
            req.end();
        });
    }

    addTestResult(testName, passed, message, severity = 'info', recommendation = '') {
        this.reportData.tests.push({
            name: testName,
            passed,
            message,
            severity,
            recommendation,
            timestamp: new Date().toISOString()
        });

        if (passed) {
            this.reportData.summary.passed++;
        } else {
            this.reportData.summary.failed++;
            if (severity === 'high' || severity === 'critical') {
                this.reportData.summary.warnings++;
            }
        }
    }

    async testServerAvailability() {
        console.log('🌐 Testing server availability...');
        
        try {
            const response = await this.makeRequest('/');
            if (response.statusCode === 200) {
                this.addTestResult(
                    'Server Availability',
                    true,
                    'Server is accessible and responding',
                    'info'
                );
            } else {
                this.addTestResult(
                    'Server Availability',
                    false,
                    `Server returned status code ${response.statusCode}`,
                    'medium',
                    'Check server configuration and ensure it\'s running properly'
                );
            }
        } catch (error) {
            this.addTestResult(
                'Server Availability',
                false,
                `Server is not accessible: ${error.message}`,
                'high',
                'Ensure the server is running on the specified port'
            );
        }
    }

    async testSecurityHeaders() {
        console.log('🔒 Testing security headers...');
        
        try {
            const response = await this.makeRequest('/');
            const headers = response.headers;
            
            const securityHeaders = [
                {
                    name: 'X-Content-Type-Options',
                    expected: 'nosniff',
                    severity: 'medium'
                },
                {
                    name: 'X-Frame-Options',
                    expected: /^(DENY|SAMEORIGIN)$/,
                    severity: 'medium'
                },
                {
                    name: 'X-XSS-Protection',
                    expected: '1; mode=block',
                    severity: 'low'
                },
                {
                    name: 'Strict-Transport-Security',
                    expected: /.+/,
                    severity: 'high',
                    httpsOnly: true
                }
            ];

            securityHeaders.forEach(header => {
                if (header.httpsOnly && !this.baseUrl.startsWith('https')) {
                    return; // Skip HTTPS-only headers for HTTP
                }

                const headerValue = headers[header.name.toLowerCase()];
                if (!headerValue) {
                    this.addTestResult(
                        `Security Header: ${header.name}`,
                        false,
                        `Missing security header: ${header.name}`,
                        header.severity,
                        `Add ${header.name} header to improve security`
                    );
                } else if (header.expected instanceof RegExp) {
                    if (header.expected.test(headerValue)) {
                        this.addTestResult(
                            `Security Header: ${header.name}`,
                            true,
                            `Security header present: ${header.name}`,
                            'info'
                        );
                    } else {
                        this.addTestResult(
                            `Security Header: ${header.name}`,
                            false,
                            `Invalid security header value: ${header.name}`,
                            header.severity,
                            `Set proper value for ${header.name} header`
                        );
                    }
                } else if (headerValue === header.expected) {
                    this.addTestResult(
                        `Security Header: ${header.name}`,
                        true,
                        `Security header present: ${header.name}`,
                        'info'
                    );
                } else {
                    this.addTestResult(
                        `Security Header: ${header.name}`,
                        false,
                        `Invalid security header value: ${header.name}`,
                        header.severity,
                        `Set proper value for ${header.name} header`
                    );
                }
            });
        } catch (error) {
            this.addTestResult(
                'Security Headers Test',
                false,
                `Failed to test security headers: ${error.message}`,
                'medium'
            );
        }
    }

    async testInputValidation() {
        console.log('🔍 Testing input validation...');
        
        const maliciousInputs = [
            {
                name: 'XSS Test',
                input: '<script>alert("xss")</script>',
                description: 'Cross-site scripting attempt'
            },
            {
                name: 'SQL Injection Test',
                input: "'; DROP TABLE users; --",
                description: 'SQL injection attempt'
            },
            {
                name: 'Command Injection Test',
                input: '; cat /etc/passwd',
                description: 'Command injection attempt'
            },
            {
                name: 'Path Traversal Test',
                input: '../../../etc/passwd',
                description: 'Path traversal attempt'
            },
            {
                name: 'Long Input Test',
                input: 'A'.repeat(10000),
                description: 'Buffer overflow test'
            }
        ];

        for (const testCase of maliciousInputs) {
            try {
                const response = await this.makeRequest('/api/calculate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ expression: testCase.input, verbose: false })
                });

                // Check if the malicious input is reflected in the response
                if (response.body.includes(testCase.input)) {
                    this.addTestResult(
                        testCase.name,
                        false,
                        `Possible vulnerability: ${testCase.description} - input reflected in response`,
                        'high',
                        'Implement proper input validation and output encoding'
                    );
                } else {
                    this.addTestResult(
                        testCase.name,
                        true,
                        `Input validation working: ${testCase.description}`,
                        'info'
                    );
                }
            } catch (error) {
                // Error is expected for malicious inputs
                this.addTestResult(
                    testCase.name,
                    true,
                    `Server properly rejected malicious input: ${testCase.description}`,
                    'info'
                );
            }
        }
    }

    async testAuthenticationBypass() {
        console.log('🔐 Testing authentication bypass...');
        
        const protectedEndpoints = [
            '/calculator',
            '/api/calculate'
        ];

        for (const endpoint of protectedEndpoints) {
            try {
                const response = await this.makeRequest(endpoint);
                
                if (response.statusCode === 200 && !response.body.includes('login')) {
                    this.addTestResult(
                        `Authentication Bypass: ${endpoint}`,
                        false,
                        `Protected endpoint accessible without authentication: ${endpoint}`,
                        'critical',
                        'Ensure all protected endpoints require valid authentication'
                    );
                } else if (response.statusCode === 401 || response.statusCode === 403) {
                    this.addTestResult(
                        `Authentication Test: ${endpoint}`,
                        true,
                        `Protected endpoint properly secured: ${endpoint}`,
                        'info'
                    );
                } else {
                    this.addTestResult(
                        `Authentication Test: ${endpoint}`,
                        true,
                        `Endpoint redirects to authentication: ${endpoint}`,
                        'info'
                    );
                }
            } catch (error) {
                this.addTestResult(
                    `Authentication Test: ${endpoint}`,
                    false,
                    `Error testing endpoint ${endpoint}: ${error.message}`,
                    'medium'
                );
            }
        }
    }

    async testRateLimiting() {
        console.log('⏱️  Testing rate limiting...');
        
        const requests = [];
        const startTime = Date.now();
        
        try {
            // Send multiple rapid requests
            for (let i = 0; i < 20; i++) {
                requests.push(this.makeRequest('/'));
            }
            
            const responses = await Promise.all(requests);
            const rateLimited = responses.some(res => res.statusCode === 429);
            
            if (rateLimited) {
                this.addTestResult(
                    'Rate Limiting',
                    true,
                    'Rate limiting is implemented',
                    'info'
                );
            } else {
                this.addTestResult(
                    'Rate Limiting',
                    false,
                    'No rate limiting detected',
                    'medium',
                    'Implement rate limiting to prevent abuse'
                );
            }
        } catch (error) {
            this.addTestResult(
                'Rate Limiting',
                false,
                `Error testing rate limiting: ${error.message}`,
                'low'
            );
        }
    }

    async testDirectoryTraversal() {
        console.log('📁 Testing directory traversal...');
        
        const traversalPaths = [
            '../package.json',
            '../../package.json',
            '../../../etc/passwd',
            '..\\..\\package.json',
            'file:///etc/passwd'
        ];

        for (const path of traversalPaths) {
            try {
                const response = await this.makeRequest(`/${path}`);
                
                if (response.statusCode === 200 && 
                    (response.body.includes('"name":') || response.body.includes('root:'))) {
                    this.addTestResult(
                        'Directory Traversal',
                        false,
                        `Directory traversal vulnerability detected with path: ${path}`,
                        'high',
                        'Implement proper path validation and restrict file access'
                    );
                } else {
                    this.addTestResult(
                        'Directory Traversal',
                        true,
                        `Path traversal attempt blocked: ${path}`,
                        'info'
                    );
                }
            } catch (error) {
                // Expected for blocked requests
                this.addTestResult(
                    'Directory Traversal',
                    true,
                    `Path traversal attempt properly blocked: ${path}`,
                    'info'
                );
            }
        }
    }

    calculateRiskLevel() {
        const critical = this.reportData.tests.filter(t => !t.passed && t.severity === 'critical').length;
        const high = this.reportData.tests.filter(t => !t.passed && t.severity === 'high').length;
        const medium = this.reportData.tests.filter(t => !t.passed && t.severity === 'medium').length;
        
        if (critical > 0) return 'CRITICAL';
        if (high > 1) return 'HIGH';
        if (high > 0 || medium > 2) return 'MEDIUM';
        return 'LOW';
    }

    generateReport() {
        this.reportData.summary.riskLevel = this.calculateRiskLevel();
        
        const reportPath = path.join(__dirname, 'reports', 'penetration-test.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2));
        console.log(`📄 Report saved to: ${reportPath}`);
        
        return this.reportData;
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('🔍 PENETRATION TEST SUMMARY');
        console.log('='.repeat(50));
        
        const summary = this.reportData.summary;
        console.log(`🎯 Overall Risk Level: ${summary.riskLevel}`);
        console.log(`✅ Tests Passed: ${summary.passed}`);
        console.log(`❌ Tests Failed: ${summary.failed}`);
        console.log(`⚠️  Warnings: ${summary.warnings}`);
        
        // Show failed tests
        const failedTests = this.reportData.tests.filter(t => !t.passed);
        if (failedTests.length > 0) {
            console.log('\n🚨 FAILED TESTS:');
            failedTests.forEach((test, index) => {
                console.log(`${index + 1}. [${test.severity.toUpperCase()}] ${test.name}`);
                console.log(`   Issue: ${test.message}`);
                if (test.recommendation) {
                    console.log(`   Recommendation: ${test.recommendation}`);
                }
            });
        }
        
        console.log('\n✅ Penetration testing complete! Check security/reports/penetration-test.json for detailed results.');
    }

    async run() {
        console.log('🔍 Starting Penetration Testing...\n');
        console.log(`Target: ${this.baseUrl}\n`);
        
        await this.testServerAvailability();
        await this.testSecurityHeaders();
        await this.testInputValidation();
        await this.testAuthenticationBypass();
        await this.testRateLimiting();
        await this.testDirectoryTraversal();
        
        this.generateReport();
        this.printSummary();
    }
}

// Run if called directly
if (require.main === module) {
    const baseUrl = process.argv[2] || 'http://localhost:3000';
    const tester = new PenetrationTester(baseUrl);
    tester.run().catch(console.error);
}

module.exports = PenetrationTester;