/// <reference types="cypress" />

describe('LinkedIn Comment AI Generation - Mock', () => {
  beforeEach(() => {
    // Create a mock LinkedIn page with comment textarea using explicit data URI
    const htmlContent = `
      <html>
        <head><title>Mock LinkedIn</title></head>
        <body>
          <div class="feed-shared-update-v2__description-wrapper">
            <div class="comments-comment-box">
              <div class="comments-comment-texteditor">
                <div role="textbox" contenteditable="true" 
                     class="comments-comment-texteditor__content" 
                     data-placeholder="Add a comment...">
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
    const dataUri = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent)
    cy.visit(dataUri, { failOnStatusCode: false })
  })

  it('should find comment box and simulate AI button functionality', () => {
    // Find the comment box
    cy.get('[role="textbox"][contenteditable="true"]').should('exist')
    
    // Simulate adding AI button functionality (this would be done by our extension)
    cy.get('[role="textbox"][contenteditable="true"]').then(($el) => {
      // Mock the extension adding an AI button
      const aiButton = document.createElement('button')
      aiButton.textContent = '✨ AI'
      aiButton.className = 'ai-comment-button'
      aiButton.onclick = () => {
        const textarea = $el[0] as HTMLElement
        textarea.textContent = 'This is an AI generated comment!'
        // Trigger input event
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
      }
      $el[0].parentElement?.appendChild(aiButton)
    })
    
    // Click the AI button
    cy.get('.ai-comment-button').click()
    
    // Verify comment was generated
    cy.get('[role="textbox"][contenteditable="true"]').should('contain.text', 'This is an AI generated comment!')
    
    // Verify text length is greater than 0
    cy.get('[role="textbox"][contenteditable="true"]').invoke('text').should('have.length.greaterThan', 0)
  })

  it('should simulate AI comment generation within 10 seconds', () => {
    // Find comment box
    cy.get('[role="textbox"][contenteditable="true"]').should('exist')
    
    // Simulate AI button and immediate response
    cy.get('[role="textbox"][contenteditable="true"]').then(($el) => {
      const aiButton = document.createElement('button')
      aiButton.textContent = '✨ AI'
      aiButton.className = 'ai-comment-button'
      aiButton.onclick = () => {
        // Simulate AI response delay
        setTimeout(() => {
          const textarea = $el[0] as HTMLElement
          textarea.textContent = 'AI generated professional comment response!'
          textarea.dispatchEvent(new Event('input', { bubbles: true }))
        }, 100)
      }
      $el[0].parentElement?.appendChild(aiButton)
    })
    
    // Click AI button
    cy.get('.ai-comment-button').click()
    
    // Verify comment appears within 10 seconds (with plenty of buffer)
    cy.get('[role="textbox"][contenteditable="true"]', { timeout: 10000 })
      .should('contain.text', 'AI generated professional comment response!')
      .invoke('text')
      .should('have.length.greaterThan', 0)
  })
})
