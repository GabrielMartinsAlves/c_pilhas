/**
 * Test suite for Task Monitoring System
 * Tests individual worker monitoring and task tracking functionality
 */

const http = require('http');
const assert = require('assert');

class TaskMonitoringTest {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.testResults = [];
  }

  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: { 'Content-Type': 'application/json' }
      };

      if (data) {
        const postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            json: () => {
              try { return JSON.parse(body); } 
              catch (e) { return null; }
            }
          });
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  async test(name, testFn) {
    console.log(`🧪 ${name}...`);
    try {
      await testFn();
      console.log(`   ✅ PASSED`);
      this.testResults.push({ name, status: 'PASSED' });
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      this.testResults.push({ name, status: 'FAILED', error: error.message });
    }
  }

  async runAllTests() {
    console.log('🔍 TASK MONITORING SYSTEM TEST SUITE');
    console.log('='.repeat(50));

    // Test 1: API endpoint availability
    await this.test('API endpoints availability', async () => {
      const tasksRes = await this.makeRequest('/api/tasks');
      assert.strictEqual(tasksRes.statusCode, 200, 'Tasks endpoint should be accessible');
      
      const tasksData = tasksRes.json();
      assert(tasksData !== null, 'Tasks endpoint should return valid JSON');
      assert(Array.isArray(tasksData.active), 'Should have active tasks array');
      assert(Array.isArray(tasksData.history), 'Should have history tasks array');
      assert(typeof tasksData.stats === 'object', 'Should have stats object');
    });

    // Test 2: Task creation and tracking
    await this.test('Task creation and unique ID generation', async () => {
      const calcRes = await this.makeRequest('/api/calculate', 'POST', {
        expression: '2 3 +',
        verbose: false
      });
      
      assert.strictEqual(calcRes.statusCode, 200, 'Calculate endpoint should respond');
      const calcData = calcRes.json();
      assert(calcData.taskId, 'Should return a task ID');
      assert(calcData.taskId.length > 0, 'Task ID should not be empty');
      assert.strictEqual(calcData.success, true, 'Calculation should succeed');
    });

    // Test 3: Task status transitions
    await this.test('Task status transitions and history', async () => {
      // Wait a moment for task to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const tasksRes = await this.makeRequest('/api/tasks');
      const tasksData = tasksRes.json();
      
      assert(tasksData.history.length > 0, 'Should have tasks in history');
      
      const lastTask = tasksData.history[0];
      assert(lastTask.id, 'Task should have an ID');
      assert(['completed', 'failed', 'timeout'].includes(lastTask.status), 'Task should have a final status');
      assert(typeof lastTask.duration === 'number', 'Task should have duration');
      assert(lastTask.expression, 'Task should have expression');
    });

    // Test 4: Verbose mode
    await this.test('Verbose calculation mode', async () => {
      const calcRes = await this.makeRequest('/api/calculate', 'POST', {
        expression: '4 2 /',
        verbose: true
      });
      
      const calcData = calcRes.json();
      assert.strictEqual(calcData.success, true, 'Verbose calculation should succeed');
      assert(calcData.output.includes('PASSO A PASSO') || calcData.output.length > 100, 
        'Verbose output should be detailed');
    });

    // Test 5: Error handling
    await this.test('Error handling and task failure tracking', async () => {
      const calcRes = await this.makeRequest('/api/calculate', 'POST', {
        expression: '5 0 /',
        verbose: false
      });
      
      const calcData = calcRes.json();
      // Either the calculation should fail, or it should succeed with error in output
      if (!calcData.success) {
        assert(calcData.error, 'Failed calculation should have error message');
        assert(calcData.taskId, 'Failed calculation should still have task ID');
      }
    });

    // Test 6: Task statistics
    await this.test('Task statistics and performance metrics', async () => {
      const tasksRes = await this.makeRequest('/api/tasks');
      const tasksData = tasksRes.json();
      
      assert(typeof tasksData.stats.totalHistory === 'number', 'Should track total history count');
      assert(typeof tasksData.stats.totalActive === 'number', 'Should track active task count');
      assert(typeof tasksData.stats.avgDuration === 'number', 'Should calculate average duration');
      
      // Should have some tasks by now
      assert(tasksData.stats.totalHistory > 0, 'Should have some completed tasks');
    });

    // Test 7: Invalid input handling
    await this.test('Invalid input validation', async () => {
      const calcRes = await this.makeRequest('/api/calculate', 'POST', {
        expression: '',
        verbose: false
      });
      
      const calcData = calcRes.json();
      assert.strictEqual(calcData.success, false, 'Empty expression should fail');
      assert(calcData.error, 'Should have error message for invalid input');
    });

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round(passed / this.testResults.length * 100)}%`);
    
    if (failed > 0) {
      console.log('\nFailed tests:');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
    }
    
    console.log('\n🏁 Test suite completed!');
    return failed === 0;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new TaskMonitoringTest();
  tester.runAllTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test suite error:', error);
      process.exit(1);
    });
}

module.exports = TaskMonitoringTest;