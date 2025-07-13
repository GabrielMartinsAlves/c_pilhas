#!/usr/bin/env node

/**
 * Static Code Analysis Tool
 * Analyzes C and JavaScript code for security vulnerabilities and code quality issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class StaticCodeAnalyzer {
    constructor() {
        this.reportData = {
            timestamp: new Date().toISOString(),
            cAnalysis: {
                files: [],
                vulnerabilities: [],
                codeQuality: []
            },
            jsAnalysis: {
                files: [],
                vulnerabilities: [],
                codeQuality: []
            },
            summary: {
                totalIssues: 0,
                criticalIssues: 0,
                riskLevel: 'LOW'
            }
        };
    }

    analyzeCCode() {
        console.log('🔍 Analyzing C code...');
        
        const cFiles = this.findFiles(path.dirname(__dirname), ['.c', '.h']);
        this.reportData.cAnalysis.files = cFiles;

        cFiles.forEach(filePath => {
            const content = fs.readFileSync(filePath, 'utf8');
            this.analyzeCFile(filePath, content);
        });

        console.log(`✅ Analyzed ${cFiles.length} C files`);
    }

    analyzeCFile(filePath, content) {
        const lines = content.split('\n');
        const fileName = path.basename(filePath);

        // Security vulnerability patterns in C
        const vulnerabilityPatterns = [
            {
                pattern: /\bgets\s*\(/g,
                severity: 'critical',
                message: 'Use of dangerous gets() function (buffer overflow risk)',
                recommendation: 'Use fgets() instead'
            },
            {
                pattern: /strcpy\s*\(/g,
                severity: 'high',
                message: 'Use of strcpy() without bounds checking',
                recommendation: 'Use strncpy() or snprintf() instead'
            },
            {
                pattern: /strcat\s*\(/g,
                severity: 'high',
                message: 'Use of strcat() without bounds checking',
                recommendation: 'Use strncat() or snprintf() instead'
            },
            {
                pattern: /sprintf\s*\(/g,
                severity: 'medium',
                message: 'Use of sprintf() without bounds checking',
                recommendation: 'Use snprintf() instead'
            },
            {
                pattern: /scanf\s*\(\s*"[^"]*%s/g,
                severity: 'high',
                message: 'Use of scanf() with %s format (buffer overflow risk)',
                recommendation: 'Use scanf() with field width specifier or fgets()'
            },
            {
                pattern: /malloc\s*\([^)]*\)(?!\s*;?\s*if\s*\()/g,
                severity: 'medium',
                message: 'malloc() without null check',
                recommendation: 'Always check malloc() return value'
            },
            {
                pattern: /free\s*\([^)]*\)(?!\s*;?\s*[^=]*=\s*NULL)/g,
                severity: 'low',
                message: 'free() without setting pointer to NULL',
                recommendation: 'Set pointer to NULL after free() to prevent double-free'
            }
        ];

        // Code quality patterns
        const qualityPatterns = [
            {
                pattern: /^#define\s+[A-Z_]+\s+\d+/gm,
                severity: 'info',
                message: 'Magic numbers found',
                recommendation: 'Consider using named constants'
            },
            {
                pattern: /if\s*\([^)]*=\s*[^=]/g,
                severity: 'medium',
                message: 'Assignment in if condition',
                recommendation: 'Use comparison operator or separate assignment'
            }
        ];

        // Check for vulnerabilities
        vulnerabilityPatterns.forEach(vulnPattern => {
            let match;
            while ((match = vulnPattern.pattern.exec(content)) !== null) {
                const lineNumber = content.substring(0, match.index).split('\n').length;
                this.reportData.cAnalysis.vulnerabilities.push({
                    file: fileName,
                    line: lineNumber,
                    severity: vulnPattern.severity,
                    message: vulnPattern.message,
                    recommendation: vulnPattern.recommendation,
                    code: lines[lineNumber - 1]?.trim()
                });
            }
        });

        // Check code quality
        qualityPatterns.forEach(qualityPattern => {
            let match;
            while ((match = qualityPattern.pattern.exec(content)) !== null) {
                const lineNumber = content.substring(0, match.index).split('\n').length;
                this.reportData.cAnalysis.codeQuality.push({
                    file: fileName,
                    line: lineNumber,
                    severity: qualityPattern.severity,
                    message: qualityPattern.message,
                    recommendation: qualityPattern.recommendation,
                    code: lines[lineNumber - 1]?.trim()
                });
            }
        });
    }

    analyzeJavaScriptCode() {
        console.log('🔍 Analyzing JavaScript code...');
        
        const jsFiles = this.findFiles(path.dirname(__dirname), ['.js']);
        this.reportData.jsAnalysis.files = jsFiles;

        jsFiles.forEach(filePath => {
            const content = fs.readFileSync(filePath, 'utf8');
            this.analyzeJSFile(filePath, content);
        });

        console.log(`✅ Analyzed ${jsFiles.length} JavaScript files`);
    }

    analyzeJSFile(filePath, content) {
        const lines = content.split('\n');
        const fileName = path.basename(filePath);

        // Security vulnerability patterns in JavaScript
        const vulnerabilityPatterns = [
            {
                pattern: /\beval\s*\(\s*[^)]/g,
                severity: 'critical',
                message: 'Use of eval() function (code injection risk)',
                recommendation: 'Avoid eval() or use safer alternatives like JSON.parse()'
            },
            {
                pattern: /innerHTML\s*=\s*[^;]*\+/g,
                severity: 'high',
                message: 'Potential XSS vulnerability with innerHTML',
                recommendation: 'Use textContent or sanitize HTML content'
            },
            {
                pattern: /document\.write\s*\(/g,
                severity: 'medium',
                message: 'Use of document.write() (XSS risk)',
                recommendation: 'Use safer DOM manipulation methods'
            },
            {
                pattern: /exec\s*\(\s*[^)]*req\./g,
                severity: 'critical',
                message: 'Potential command injection with user input',
                recommendation: 'Never pass user input directly to exec()'
            },
            {
                pattern: /setTimeout\s*\(\s*["']/g,
                severity: 'medium',
                message: 'Use of setTimeout() with string (code injection risk)',
                recommendation: 'Use function reference instead of string'
            },
            {
                pattern: /process\.env\.[A-Z_]+(?!\s*\|\|)/g,
                severity: 'low',
                message: 'Environment variable without default value',
                recommendation: 'Provide fallback values for environment variables'
            }
        ];

        // Code quality patterns
        const qualityPatterns = [
            {
                pattern: /console\.log\s*\(/g,
                severity: 'info',
                message: 'Console.log found in production code',
                recommendation: 'Remove debug statements or use proper logging'
            },
            {
                pattern: /==\s*null|null\s*==/g,
                severity: 'low',
                message: 'Use of == with null',
                recommendation: 'Use strict equality (===) for better type safety'
            },
            {
                pattern: /var\s+/g,
                severity: 'info',
                message: 'Use of var keyword',
                recommendation: 'Use let or const for block scoping'
            }
        ];

        // Check for vulnerabilities
        vulnerabilityPatterns.forEach(vulnPattern => {
            let match;
            while ((match = vulnPattern.pattern.exec(content)) !== null) {
                const lineNumber = content.substring(0, match.index).split('\n').length;
                this.reportData.jsAnalysis.vulnerabilities.push({
                    file: fileName,
                    line: lineNumber,
                    severity: vulnPattern.severity,
                    message: vulnPattern.message,
                    recommendation: vulnPattern.recommendation,
                    code: lines[lineNumber - 1]?.trim()
                });
            }
        });

        // Check code quality
        qualityPatterns.forEach(qualityPattern => {
            let match;
            while ((match = qualityPattern.pattern.exec(content)) !== null) {
                const lineNumber = content.substring(0, match.index).split('\n').length;
                this.reportData.jsAnalysis.codeQuality.push({
                    file: fileName,
                    line: lineNumber,
                    severity: qualityPattern.severity,
                    message: qualityPattern.message,
                    recommendation: qualityPattern.recommendation,
                    code: lines[lineNumber - 1]?.trim()
                });
            }
        });
    }

    findFiles(dir, extensions) {
        const files = [];
        
        function searchDir(currentDir) {
            const items = fs.readdirSync(currentDir);
            
            items.forEach(item => {
                const itemPath = path.join(currentDir, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    searchDir(itemPath);
                } else if (stats.isFile()) {
                    const ext = path.extname(item);
                    if (extensions.includes(ext)) {
                        files.push(itemPath);
                    }
                }
            });
        }
        
        searchDir(dir);
        return files;
    }

    calculateSummary() {
        const allVulns = [
            ...this.reportData.cAnalysis.vulnerabilities,
            ...this.reportData.jsAnalysis.vulnerabilities
        ];
        
        const allQuality = [
            ...this.reportData.cAnalysis.codeQuality,
            ...this.reportData.jsAnalysis.codeQuality
        ];

        this.reportData.summary = {
            totalIssues: allVulns.length + allQuality.length,
            criticalIssues: allVulns.filter(v => v.severity === 'critical').length,
            highIssues: allVulns.filter(v => v.severity === 'high').length,
            mediumIssues: allVulns.filter(v => v.severity === 'medium').length,
            lowIssues: allVulns.filter(v => v.severity === 'low').length,
            infoIssues: allQuality.filter(q => q.severity === 'info').length,
            riskLevel: this.calculateRiskLevel(allVulns)
        };
    }

    calculateRiskLevel(vulnerabilities) {
        const critical = vulnerabilities.filter(v => v.severity === 'critical').length;
        const high = vulnerabilities.filter(v => v.severity === 'high').length;
        
        if (critical > 0) return 'CRITICAL';
        if (high > 2) return 'HIGH';
        if (high > 0) return 'MEDIUM';
        return 'LOW';
    }

    generateReport() {
        this.calculateSummary();
        
        const reportPath = path.join(__dirname, 'reports', 'static-analysis.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2));
        console.log(`📄 Report saved to: ${reportPath}`);
        
        return this.reportData;
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 STATIC CODE ANALYSIS SUMMARY');
        console.log('='.repeat(50));
        
        const summary = this.reportData.summary;
        console.log(`🎯 Overall Risk Level: ${summary.riskLevel}`);
        console.log(`📁 C Files Analyzed: ${this.reportData.cAnalysis.files.length}`);
        console.log(`📁 JS Files Analyzed: ${this.reportData.jsAnalysis.files.length}`);
        console.log(`🔥 Critical Issues: ${summary.criticalIssues}`);
        console.log(`⚠️  High Issues: ${summary.highIssues}`);
        console.log(`🔸 Medium Issues: ${summary.mediumIssues}`);
        console.log(`ℹ️  Info Issues: ${summary.infoIssues}`);
        
        // Show critical issues
        const criticalIssues = [
            ...this.reportData.cAnalysis.vulnerabilities.filter(v => v.severity === 'critical'),
            ...this.reportData.jsAnalysis.vulnerabilities.filter(v => v.severity === 'critical')
        ];
        
        if (criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES:');
            criticalIssues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue.file}:${issue.line} - ${issue.message}`);
                console.log(`   Recommendation: ${issue.recommendation}`);
            });
        }
        
        console.log('\n✅ Analysis complete! Check security/reports/static-analysis.json for detailed results.');
    }

    async run() {
        console.log('🔍 Starting Static Code Analysis...\n');
        
        this.analyzeCCode();
        this.analyzeJavaScriptCode();
        this.generateReport();
        this.printSummary();
    }
}

// Run if called directly
if (require.main === module) {
    const analyzer = new StaticCodeAnalyzer();
    analyzer.run().catch(console.error);
}

module.exports = StaticCodeAnalyzer;