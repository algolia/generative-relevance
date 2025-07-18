export function validateEnvVars() {
  const requiredVars = ['ANTHROPIC_API_KEY'];
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease create a .env file with the required variables.');
    console.error('Example .env file:');
    console.error('ANTHROPIC_API_KEY=your_anthropic_api_key_here');
    process.exit(1);
  }
}

export function validateJsonFile(fileContent: string) {
  try {
    const records = JSON.parse(fileContent);
    
    if (!Array.isArray(records)) {
      console.error('❌ Error: JSON file must contain an array of records');
      process.exit(1);
    }
    
    return records;
  } catch (error) {
    console.error('❌ Error: Invalid JSON file');
    process.exit(1);
  }
}