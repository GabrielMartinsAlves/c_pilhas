#!/usr/bin/env node

/**
 * Security Report Generator
 * Consolidates all security analysis results into comprehensive reports
 */

const fs = require('fs');
const path = require('path');
const DependencyAnalyzer = require('./dependency-analysis');
const StaticCodeAnalyzer = require('./static-analysis');
const PenetrationTester = require('./penetration-test');

class SecurityReportGenerator {
    constructor() {
        this.reportData = {
            timestamp: new Date().toISOString(),
            executive_summary: {},
            dependency_analysis: null,
            static_analysis: null,
            penetration_test: null,
            consolidated_recommendations: [],
            risk_assessment: {
                overall_risk: 'LOW',
                risk_factors: [],
                mitigation_priorities: []
            }
        };
    }

    async runAllAnalyses() {
        console.log('🔐 Running comprehensive security analysis...\n');
        
        // Run dependency analysis
        console.log('1️⃣  Running dependency analysis...');
        const depAnalyzer = new DependencyAnalyzer();
        await depAnalyzer.run();
        this.reportData.dependency_analysis = depAnalyzer.reportData;
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        // Run static code analysis
        console.log('2️⃣  Running static code analysis...');
        const staticAnalyzer = new StaticCodeAnalyzer();
        await staticAnalyzer.run();
        this.reportData.static_analysis = staticAnalyzer.reportData;
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        // Run penetration testing
        console.log('3️⃣  Running penetration testing...');
        const penTester = new PenetrationTester();
        await penTester.run();
        this.reportData.penetration_test = penTester.reportData;
    }

    generateExecutiveSummary() {
        const depSummary = this.reportData.dependency_analysis?.summary || {};
        const staticSummary = this.reportData.static_analysis?.summary || {};
        const penSummary = this.reportData.penetration_test?.summary || {};
        
        this.reportData.executive_summary = {
            total_vulnerabilities: (depSummary.totalVulnerabilities || 0) + 
                                   (staticSummary.criticalIssues || 0) + 
                                   (penSummary.failed || 0),
            critical_issues: (staticSummary.criticalIssues || 0) + 
                           this.countCriticalPenTestIssues(),
            risk_level: this.calculateOverallRisk(),
            recommendations_count: this.reportData.consolidated_recommendations.length,
            security_score: this.calculateSecurityScore()
        };
    }

    countCriticalPenTestIssues() {
        if (!this.reportData.penetration_test?.tests) return 0;
        return this.reportData.penetration_test.tests
            .filter(t => !t.passed && (t.severity === 'critical' || t.severity === 'high')).length;
    }

    calculateOverallRisk() {
        const risks = [
            this.reportData.dependency_analysis?.summary?.riskLevel,
            this.reportData.static_analysis?.summary?.riskLevel,
            this.reportData.penetration_test?.summary?.riskLevel
        ].filter(Boolean);
        
        if (risks.includes('CRITICAL')) return 'CRITICAL';
        if (risks.includes('HIGH')) return 'HIGH';
        if (risks.includes('MEDIUM')) return 'MEDIUM';
        return 'LOW';
    }

    calculateSecurityScore() {
        let score = 100;
        
        // Deduct points for vulnerabilities
        const depVulns = this.reportData.dependency_analysis?.summary?.totalVulnerabilities || 0;
        const staticCritical = this.reportData.static_analysis?.summary?.criticalIssues || 0;
        const staticHigh = this.reportData.static_analysis?.summary?.highIssues || 0;
        const penFailed = this.reportData.penetration_test?.summary?.failed || 0;
        
        score -= (depVulns * 5);
        score -= (staticCritical * 20);
        score -= (staticHigh * 10);
        score -= (penFailed * 15);
        
        return Math.max(0, Math.min(100, score));
    }

    consolidateRecommendations() {
        const recommendations = [];
        
        // From dependency analysis
        if (this.reportData.dependency_analysis?.recommendations) {
            this.reportData.dependency_analysis.recommendations.forEach(rec => {
                recommendations.push({
                    source: 'dependency_analysis',
                    priority: this.mapSeverityToPriority(rec.severity),
                    category: rec.category,
                    title: rec.message,
                    description: rec.action,
                    severity: rec.severity
                });
            });
        }
        
        // From static analysis
        if (this.reportData.static_analysis?.cAnalysis?.vulnerabilities) {
            const criticalVulns = this.reportData.static_analysis.cAnalysis.vulnerabilities
                .filter(v => v.severity === 'critical' || v.severity === 'high');
            
            criticalVulns.forEach(vuln => {
                recommendations.push({
                    source: 'static_analysis',
                    priority: this.mapSeverityToPriority(vuln.severity),
                    category: 'code_security',
                    title: `${vuln.file}:${vuln.line} - ${vuln.message}`,
                    description: vuln.recommendation,
                    severity: vuln.severity
                });
            });
        }
        
        if (this.reportData.static_analysis?.jsAnalysis?.vulnerabilities) {
            const criticalVulns = this.reportData.static_analysis.jsAnalysis.vulnerabilities
                .filter(v => v.severity === 'critical' || v.severity === 'high');
            
            criticalVulns.forEach(vuln => {
                recommendations.push({
                    source: 'static_analysis',
                    priority: this.mapSeverityToPriority(vuln.severity),
                    category: 'code_security',
                    title: `${vuln.file}:${vuln.line} - ${vuln.message}`,
                    description: vuln.recommendation,
                    severity: vuln.severity
                });
            });
        }
        
        // From penetration testing
        if (this.reportData.penetration_test?.tests) {
            const failedTests = this.reportData.penetration_test.tests
                .filter(t => !t.passed && t.recommendation);
            
            failedTests.forEach(test => {
                recommendations.push({
                    source: 'penetration_test',
                    priority: this.mapSeverityToPriority(test.severity),
                    category: 'web_security',
                    title: test.name,
                    description: test.recommendation,
                    severity: test.severity
                });
            });
        }
        
        // Sort by priority
        recommendations.sort((a, b) => a.priority - b.priority);
        
        this.reportData.consolidated_recommendations = recommendations;
    }

    mapSeverityToPriority(severity) {
        const mapping = {
            'critical': 1,
            'high': 2,
            'medium': 3,
            'low': 4,
            'info': 5
        };
        return mapping[severity] || 5;
    }

    generateRiskAssessment() {
        const riskFactors = [];
        const mitigationPriorities = [];
        
        // Analyze risk factors
        const depVulns = this.reportData.dependency_analysis?.summary?.totalVulnerabilities || 0;
        if (depVulns > 0) {
            riskFactors.push({
                factor: 'Vulnerable Dependencies',
                impact: 'High',
                description: `${depVulns} vulnerable npm packages detected`
            });
            mitigationPriorities.push({
                priority: 1,
                action: 'Update vulnerable dependencies',
                timeline: 'Immediate'
            });
        }
        
        const staticCritical = this.reportData.static_analysis?.summary?.criticalIssues || 0;
        if (staticCritical > 0) {
            riskFactors.push({
                factor: 'Critical Code Vulnerabilities',
                impact: 'Critical',
                description: `${staticCritical} critical security issues in code`
            });
            mitigationPriorities.push({
                priority: 1,
                action: 'Fix critical code vulnerabilities',
                timeline: 'Immediate'
            });
        }
        
        const penFailed = this.reportData.penetration_test?.summary?.failed || 0;
        if (penFailed > 0) {
            riskFactors.push({
                factor: 'Web Application Vulnerabilities',
                impact: 'Medium',
                description: `${penFailed} security tests failed`
            });
            mitigationPriorities.push({
                priority: 2,
                action: 'Strengthen web application security',
                timeline: 'Within 1 week'
            });
        }
        
        this.reportData.risk_assessment = {
            overall_risk: this.calculateOverallRisk(),
            risk_factors: riskFactors,
            mitigation_priorities: mitigationPriorities
        };
    }

    generateJsonReport() {
        const reportPath = path.join(__dirname, 'reports', 'security-report-comprehensive.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2));
        console.log(`📄 Comprehensive JSON report saved to: ${reportPath}`);
    }

    generateHtmlReport() {
        const htmlContent = this.createHtmlReport();
        const reportPath = path.join(__dirname, 'reports', 'security-report.html');
        fs.writeFileSync(reportPath, htmlContent);
        console.log(`📄 HTML report saved to: ${reportPath}`);
    }

    createHtmlReport() {
        const summary = this.reportData.executive_summary;
        const riskLevel = summary.risk_level;
        const riskColor = {
            'CRITICAL': '#dc3545',
            'HIGH': '#fd7e14',
            'MEDIUM': '#ffc107',
            'LOW': '#28a745'
        }[riskLevel] || '#6c757d';

        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Segurança - RPN Calculator</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .risk-badge {
            display: inline-block;
            padding: 10px 20px;
            border-radius: 25px;
            color: white;
            font-weight: bold;
            background-color: ${riskColor};
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            color: #333;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
        }
        .recommendations {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .recommendation {
            margin-bottom: 15px;
            padding: 15px;
            background: white;
            border-radius: 5px;
            border-left: 4px solid #ffc107;
        }
        .recommendation.critical {
            border-left-color: #dc3545;
        }
        .recommendation.high {
            border-left-color: #fd7e14;
        }
        .recommendation.medium {
            border-left-color: #ffc107;
        }
        .recommendation.low {
            border-left-color: #28a745;
        }
        .vulnerability-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .vulnerability-table th,
        .vulnerability-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .vulnerability-table th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .severity-critical { color: #dc3545; font-weight: bold; }
        .severity-high { color: #fd7e14; font-weight: bold; }
        .severity-medium { color: #ffc107; font-weight: bold; }
        .severity-low { color: #28a745; }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e9ecef;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Relatório de Segurança</h1>
            <h2>RPN Calculator System</h2>
            <p>Gerado em: ${new Date(this.reportData.timestamp).toLocaleString('pt-BR')}</p>
            <div class="risk-badge">${riskLevel} RISK</div>
        </div>

        <div class="section">
            <h2>📊 Resumo Executivo</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Score de Segurança</h3>
                    <div class="value">${summary.security_score}/100</div>
                </div>
                <div class="summary-card">
                    <h3>Vulnerabilidades Totais</h3>
                    <div class="value">${summary.total_vulnerabilities}</div>
                </div>
                <div class="summary-card">
                    <h3>Problemas Críticos</h3>
                    <div class="value">${summary.critical_issues}</div>
                </div>
                <div class="summary-card">
                    <h3>Recomendações</h3>
                    <div class="value">${summary.recommendations_count}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>🎯 Principais Recomendações</h2>
            <div class="recommendations">
                ${this.reportData.consolidated_recommendations.slice(0, 5).map(rec => `
                    <div class="recommendation ${rec.severity}">
                        <h4>[${rec.severity.toUpperCase()}] ${rec.title}</h4>
                        <p>${rec.description}</p>
                        <small>Fonte: ${rec.source.replace('_', ' ')}</small>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>📦 Análise de Dependências</h2>
            <p><strong>Dependências analisadas:</strong> ${this.reportData.dependency_analysis?.packageAnalysis?.totalDependencies || 0}</p>
            <p><strong>Vulnerabilidades encontradas:</strong> ${this.reportData.dependency_analysis?.summary?.totalVulnerabilities || 0}</p>
            <p><strong>Nível de risco:</strong> <span class="severity-${(this.reportData.dependency_analysis?.summary?.riskLevel || 'low').toLowerCase()}">${this.reportData.dependency_analysis?.summary?.riskLevel || 'LOW'}</span></p>
        </div>

        <div class="section">
            <h2>🔍 Análise Estática de Código</h2>
            <p><strong>Arquivos C analisados:</strong> ${this.reportData.static_analysis?.cAnalysis?.files?.length || 0}</p>
            <p><strong>Arquivos JS analisados:</strong> ${this.reportData.static_analysis?.jsAnalysis?.files?.length || 0}</p>
            <p><strong>Problemas críticos:</strong> ${this.reportData.static_analysis?.summary?.criticalIssues || 0}</p>
            <p><strong>Problemas de alta severidade:</strong> ${this.reportData.static_analysis?.summary?.highIssues || 0}</p>
            
            ${this.reportData.static_analysis?.cAnalysis?.vulnerabilities?.length > 0 ? `
                <h3>Vulnerabilidades em C</h3>
                <table class="vulnerability-table">
                    <thead>
                        <tr>
                            <th>Arquivo</th>
                            <th>Linha</th>
                            <th>Severidade</th>
                            <th>Problema</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.reportData.static_analysis.cAnalysis.vulnerabilities.slice(0, 10).map(vuln => `
                            <tr>
                                <td>${vuln.file}</td>
                                <td>${vuln.line}</td>
                                <td class="severity-${vuln.severity}">${vuln.severity.toUpperCase()}</td>
                                <td>${vuln.message}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : ''}
        </div>

        <div class="section">
            <h2>🕵️ Teste de Penetração</h2>
            <p><strong>Testes executados:</strong> ${this.reportData.penetration_test?.tests?.length || 0}</p>
            <p><strong>Testes aprovados:</strong> ${this.reportData.penetration_test?.summary?.passed || 0}</p>
            <p><strong>Testes falharam:</strong> ${this.reportData.penetration_test?.summary?.failed || 0}</p>
            <p><strong>Avisos de segurança:</strong> ${this.reportData.penetration_test?.summary?.warnings || 0}</p>
        </div>

        <div class="section">
            <h2>⚠️ Avaliação de Risco</h2>
            <p><strong>Risco geral:</strong> <span class="severity-${this.reportData.risk_assessment?.overall_risk?.toLowerCase()}">${this.reportData.risk_assessment?.overall_risk}</span></p>
            
            ${this.reportData.risk_assessment?.risk_factors?.length > 0 ? `
                <h3>Fatores de Risco</h3>
                <ul>
                    ${this.reportData.risk_assessment.risk_factors.map(factor => `
                        <li><strong>${factor.factor}</strong> (${factor.impact}): ${factor.description}</li>
                    `).join('')}
                </ul>
            ` : ''}
            
            ${this.reportData.risk_assessment?.mitigation_priorities?.length > 0 ? `
                <h3>Prioridades de Mitigação</h3>
                <ol>
                    ${this.reportData.risk_assessment.mitigation_priorities.map(priority => `
                        <li><strong>${priority.action}</strong> - ${priority.timeline}</li>
                    `).join('')}
                </ol>
            ` : ''}
        </div>

        <div class="footer">
            <p>Relatório gerado automaticamente pelo Sistema de Verificação de Segurança</p>
            <p>Para questões técnicas, consulte os relatórios detalhados em JSON</p>
        </div>
    </div>
</body>
</html>`;
    }

    printOverallSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('🔐 RELATÓRIO CONSOLIDADO DE SEGURANÇA');
        console.log('='.repeat(60));
        
        const summary = this.reportData.executive_summary;
        console.log(`🎯 Risco Geral: ${summary.risk_level}`);
        console.log(`📊 Score de Segurança: ${summary.security_score}/100`);
        console.log(`🔢 Total de Vulnerabilidades: ${summary.total_vulnerabilities}`);
        console.log(`🚨 Problemas Críticos: ${summary.critical_issues}`);
        console.log(`💡 Recomendações: ${summary.recommendations_count}`);
        
        console.log('\n📋 PRINCIPAIS RECOMENDAÇÕES:');
        this.reportData.consolidated_recommendations.slice(0, 5).forEach((rec, index) => {
            console.log(`${index + 1}. [${rec.severity.toUpperCase()}] ${rec.title}`);
            console.log(`   ${rec.description}`);
        });
        
        console.log('\n📄 Relatórios gerados:');
        console.log('   - security/reports/security-report.html (relatório visual)');
        console.log('   - security/reports/security-report-comprehensive.json (dados completos)');
        console.log('   - security/reports/dependency-analysis.json');
        console.log('   - security/reports/static-analysis.json');
        console.log('   - security/reports/penetration-test.json');
        
        console.log('\n✅ Análise de segurança concluída!');
    }

    async run() {
        console.log('🛡️  Starting Comprehensive Security Analysis...\n');
        
        await this.runAllAnalyses();
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 Generating consolidated reports...\n');
        
        this.consolidateRecommendations();
        this.generateRiskAssessment();
        this.generateExecutiveSummary();
        this.generateJsonReport();
        this.generateHtmlReport();
        this.printOverallSummary();
    }
}

// Run if called directly
if (require.main === module) {
    const generator = new SecurityReportGenerator();
    generator.run().catch(console.error);
}

module.exports = SecurityReportGenerator;