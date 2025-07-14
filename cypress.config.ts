import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'https://www.linkedin.com',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // Chrome extension testing specific settings
    chromeWebSecurity: false,
    experimentalStudio: true,
    supportFile: 'tests/e2e/support/e2e.ts',
    specPattern: 'tests/e2e/**/*.cy.ts'
  },
})
