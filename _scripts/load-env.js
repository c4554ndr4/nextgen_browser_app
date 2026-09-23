#!/usr/bin/env node

/**
 * Load environment variables from .env file and run the build command
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const envPath = path.join(__dirname, '..', '.env')

// Load environment variables
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=')
        process.env[key] = value
        console.log(`Loaded env var: ${key}`)
      }
    }
  })
  
  console.log('✅ Environment variables loaded from .env')
} else {
  console.log('⚠️ No .env file found')
}

// Get the remaining arguments (everything after this script)
const args = process.argv.slice(2)

if (args.length > 0) {
  // Spawn the next command with the loaded environment
  const child = spawn('node', args, {
    stdio: 'inherit',
    env: process.env
  })
  
  child.on('exit', (code) => {
    process.exit(code)
  })
} else {
  console.log('No command specified to run after loading environment')
} 