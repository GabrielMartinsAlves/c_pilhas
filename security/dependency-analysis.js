#!/usr/bin/env node

/**
 * Dependency Security Analysis Tool
 * Analyzes npm dependencies and system libraries for security vulnerabilities
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DependencyAnalyzer {
    constructor() {
        this.reportData = {
            timestamp: new Date().toISOString(),
            npmAudit: null,
            packageAnalysis: null,
            systemDependencies: null,
            recommendations: []
        };
    }

    async runNpmAudit() {
        console.log('🔍 Running npm audit...');
        try {
            // Run npm audit and capture output
            const auditResult = execSync('npm audit --json', { 
                cwd: path.dirname(__dirname),
                encoding: 'utf8'
            });
            
            this.reportData.npmAudit = JSON.parse(auditResult);
            console.log('✅ npm audit completed');
            
            if (this.reportData.npmAudit.metadata.vulnerabilities.total > 0) {
                this.reportData.recommendations.push({
                    category: 'dependencies',
                    severity: 'high',
                    message: `Found ${this.reportData.npmAudit.metadata.vulnerabilities.total} npm vulnerabilities`,
                    action: 'Run npm audit fix to resolve automatically fixable vulnerabilities'
                });
            }
            
        } catch (error) {
            // npm audit returns non-zero exit code if vulnerabilities found
            if (error.stdout) {
                try {
                    this.reportData.npmAudit = JSON.parse(error.stdout);
                    console.log('⚠️  npm audit found vulnerabilities');
                } catch (parseError) {
                    console.error('❌ Failed to parse npm audit output:', parseError.message);
                    this.reportData.npmAudit = { error: error.message };
                }
            } else {
                console.error('❌ npm audit failed:', error.message);
                this.reportData.npmAudit = { error: error.message };
            }
        }
    }

    analyzePackageJson() {
        console.log('📦 Analyzing package.json...');
        try {
            const packagePath = path.join(path.dirname(__dirname), 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            this.reportData.packageAnalysis = {
                name: packageJson.name,
                version: packageJson.version,
                dependencies: Object.keys(packageJson.dependencies || {}),
                devDependencies: Object.keys(packageJson.devDependencies || {}),
                totalDependencies: Object.keys(packageJson.dependencies || {}).length + 
                                 Object.keys(packageJson.devDependencies || {}).length
            };

            // Check for potentially risky dependencies
            const riskyPatterns = ['eval', 'exec', 'shell', 'unsafe'];
            const deps = [...this.reportData.packageAnalysis.dependencies, ...this.reportData.packageAnalysis.devDependencies];
            
            deps.forEach(dep => {
                riskyPatterns.forEach(pattern => {
                    if (dep.toLowerCase().includes(pattern)) {
                        this.reportData.recommendations.push({
                            category: 'dependencies',
                            severity: 'medium',
                            message: `Potentially risky dependency detected: ${dep}`,
                            action: 'Review dependency for security implications'
                        });
                    }
                });
            });

            console.log('✅ package.json analysis completed');
        } catch (error) {
            console.error('❌ Failed to analyze package.json:', error.message);
            this.reportData.packageAnalysis = { error: error.message };
        }
    }

    checkSystemDependencies() {
        console.log('🖥️  Checking system dependencies...');
        
        const systemDeps = {
            nodejs: this.checkCommand('node --version'),
            npm: this.checkCommand('npm --version'),
            gcc: this.checkCommand('gcc --version | head -1'),
            make: this.checkCommand('make --version | head -1'),
            git: this.checkCommand('git --version')
        };

        this.reportData.systemDependencies = systemDeps;

        // Check for outdated Node.js versions
        if (systemDeps.nodejs.version) {
            const nodeVersion = systemDeps.nodejs.version.replace('v', '');
            const majorVersion = parseInt(nodeVersion.split('.')[0]);
            
            if (majorVersion < 16) {
                this.reportData.recommendations.push({
                    category: 'system',
                    severity: 'high',
                    message: `Node.js version ${nodeVersion} is outdated`,
                    action: 'Upgrade to Node.js 18 LTS or newer for latest security patches'
                });
            }
        }

        console.log('✅ System dependencies check completed');
    }

    checkCommand(command) {
        try {
            const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
            return {
                available: true,
                version: output.trim().split('\n')[0]
            };
        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }

    generateReport() {
        const reportPath = path.join(__dirname, 'reports', 'dependency-analysis.json');
        const reportDir = path.dirname(reportPath);
        
        // Create reports directory if it doesn't exist
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        // Add summary to report
        this.reportData.summary = {
            totalVulnerabilities: this.reportData.npmAudit?.metadata?.vulnerabilities?.total || 0,
            totalDependencies: this.reportData.packageAnalysis?.totalDependencies || 0,
            recommendationsCount: this.reportData.recommendations.length,
            riskLevel: this.calculateRiskLevel()
        };

        fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2));
        console.log(`📄 Report saved to: ${reportPath}`);
        
        return this.reportData;
    }

    calculateRiskLevel() {
        const vulnCount = this.reportData.npmAudit?.metadata?.vulnerabilities?.total || 0;
        const recCount = this.reportData.recommendations.length;
        
        if (vulnCount > 10 || recCount > 5) return 'HIGH';
        if (vulnCount > 0 || recCount > 2) return 'MEDIUM';
        return 'LOW';
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 DEPENDENCY SECURITY ANALYSIS SUMMARY');
        console.log('='.repeat(50));
        
        const summary = this.reportData.summary;
        console.log(`🎯 Overall Risk Level: ${summary.riskLevel}`);
        console.log(`🔢 Total Dependencies: ${summary.totalDependencies}`);
        console.log(`⚠️  Total Vulnerabilities: ${summary.totalVulnerabilities}`);
        console.log(`💡 Recommendations: ${summary.recommendationsCount}`);
        
        if (this.reportData.recommendations.length > 0) {
            console.log('\n📋 Key Recommendations:');
            this.reportData.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. [${rec.severity.toUpperCase()}] ${rec.message}`);
                console.log(`   Action: ${rec.action}`);
            });
        }
        
        console.log('\n✅ Analysis complete! Check security/reports/dependency-analysis.json for detailed results.');
    }

    async run() {
        console.log('🔐 Starting Dependency Security Analysis...\n');
        
        await this.runNpmAudit();
        this.analyzePackageJson();
        this.checkSystemDependencies();
        this.generateReport();
        this.printSummary();
    }
}

// Run if called directly
if (require.main === module) {
    const analyzer = new DependencyAnalyzer();
    analyzer.run().catch(console.error);
}

module.exports = DependencyAnalyzer;