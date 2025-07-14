/// <reference types="cypress" />

// Import commands.ts to register custom commands
import './commands'

// Handle LinkedIn authentication errors that occur in test environment
Cypress.on('uncaught:exception', (err, runnable) => {
  // Don't fail tests on LinkedIn auth errors or other client-side issues
  if (err.message.includes('Cannot read properties of undefined') ||
      err.message.includes('_initMicrosoftAuth') ||
      err.message.includes('Microsoft') ||
      err.message.includes('then')) {
    return false
  }
  return true
})

// Add global configuration and setup here
beforeEach(() => {
  // Intercept and stub external requests that might interfere with tests
  cy.intercept('GET', '**/analytics/**', { statusCode: 200, body: {} })
  cy.intercept('GET', '**/tracking/**', { statusCode: 200, body: {} })
})
