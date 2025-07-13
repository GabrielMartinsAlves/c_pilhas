#!/usr/bin/env node

// Simple test script for worker monitoring functionality
const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testWorkerFunctionality() {
  console.log('🧮 Testing RPN Calculator Worker Monitoring...\n');

  try {
    // Test 1: Health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await makeRequest('/api/health');
    if (healthResponse.status === 200) {
      console.log('   ✅ Health endpoint working');
      console.log(`   📊 Worker status: ${healthResponse.data.status}`);
    } else {
      console.log('   ❌ Health endpoint failed');
    }

    // Test 2: Simple calculation
    console.log('\n2. Testing simple calculation...');
    const calcResponse = await makeRequest('/api/calculate', 'POST', {
      expression: '3 4 +',
      verbose: false
    });
    if (calcResponse.status === 200 && calcResponse.data.success) {
      console.log('   ✅ Simple calculation working');
      console.log(`   📝 Task ID: ${calcResponse.data.taskId}`);
    } else {
      console.log('   ❌ Simple calculation failed');
      console.log(`   Error: ${calcResponse.data.error}`);
    }

    // Test 3: Worker testing endpoint
    console.log('\n3. Testing worker test endpoint...');
    const workerTestResponse = await makeRequest('/api/worker-test', 'POST');
    if (workerTestResponse.status === 200) {
      console.log('   ✅ Worker test endpoint working');
      if (workerTestResponse.data.success) {
        console.log(`   📊 All tests passed: ${workerTestResponse.data.summary.passed}/${workerTestResponse.data.summary.total}`);
      } else {
        console.log(`   ⚠️ Some tests failed: ${workerTestResponse.data.summary.passed}/${workerTestResponse.data.summary.total}`);
      }
    } else {
      console.log('   ❌ Worker test endpoint failed');
    }

    // Test 4: Task monitoring
    console.log('\n4. Testing task monitoring...');
    const tasksResponse = await makeRequest('/api/tasks?limit=5');
    if (tasksResponse.status === 200 && tasksResponse.data.success) {
      console.log('   ✅ Task monitoring working');
      console.log(`   📋 Recent tasks: ${tasksResponse.data.tasks.length}`);
      console.log(`   📈 Total tasks: ${tasksResponse.data.metrics.totalTasks}`);
    } else {
      console.log('   ❌ Task monitoring failed');
    }

    // Test 5: Complex calculation with verbose
    console.log('\n5. Testing complex calculation with verbose...');
    const complexCalcResponse = await makeRequest('/api/calculate', 'POST', {
      expression: '5 1 2 + 4 * + 3 -',
      verbose: true
    });
    if (complexCalcResponse.status === 200 && complexCalcResponse.data.success) {
      console.log('   ✅ Complex calculation working');
      console.log(`   📝 Task ID: ${complexCalcResponse.data.taskId}`);
    } else {
      console.log('   ❌ Complex calculation failed');
    }

    // Final health check
    console.log('\n6. Final health check...');
    const finalHealthResponse = await makeRequest('/api/health');
    if (finalHealthResponse.status === 200) {
      const metrics = finalHealthResponse.data.metrics;
      console.log('   ✅ Final health check complete');
      console.log(`   📊 Final metrics:`);
      console.log(`      - Total tasks: ${metrics.totalTasks}`);
      console.log(`      - Successful: ${metrics.successfulTasks}`);
      console.log(`      - Failed: ${metrics.failedTasks}`);
      console.log(`      - Average time: ${metrics.averageExecutionTime.toFixed(2)}ms`);
      console.log(`      - Worker health: ${metrics.workerHealth}`);
    }

    console.log('\n🎉 Worker monitoring test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('/api/health');
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('Checking if server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running. Please start the server first with: npm start');
    process.exit(1);
  }
  
  console.log('✅ Server is running. Starting tests...\n');
  await testWorkerFunctionality();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testWorkerFunctionality, makeRequest };