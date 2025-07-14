/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    stubLinkedInLogin(): void
    loadExtension(): void
    waitForAIButton(): Chainable<JQuery<HTMLElement>>
  }
}

// Stub LinkedIn login by setting authentication cookies
Cypress.Commands.add('stubLinkedInLogin', () => {
  // Set essential LinkedIn cookies to simulate logged-in state
  cy.setCookie('li_at', 'mock-linkedin-auth-token', {
    domain: '.linkedin.com',
    httpOnly: true,
    secure: true
  })
  
  cy.setCookie('JSESSIONID', 'mock-session-id', {
    domain: '.linkedin.com',
    httpOnly: true,
    secure: true
  })
  
  cy.setCookie('liap', 'true', {
    domain: '.linkedin.com',
    secure: true
  })
})

// Load Chrome extension (for manual testing with Cypress)
Cypress.Commands.add('loadExtension', () => {
  // In a real Chrome extension test, you would use chrome.extension APIs
  // For this test, we'll simulate the extension being present
  cy.window().then((win) => {
    // Simulate extension environment
    (win as any).chrome = (win as any).chrome || {}
    ;(win as any).chrome.runtime = (win as any).chrome.runtime || {
      sendMessage: cy.stub().resolves({ comments: ['Test AI comment'] }),
      onMessage: {
        addListener: cy.stub()
      }
    }
  })
})

// Wait for AI button to appear in comment box
Cypress.Commands.add('waitForAIButton', () => {
  return cy.get('[data-test-id="ai-comment-button"], .ai-comment-button, button[title*="AI"]', {
    timeout: 10000
  }).should('be.visible')
})
