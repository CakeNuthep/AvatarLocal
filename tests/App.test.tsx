import { render, screen, fireEvent } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Provider } from 'react-redux'
import { store } from '../src/store'
import App from '../src/App'
import '../src/i18n'

test('renders App component and handles language switching', () => {
  render(
    <Provider store={store}>
      <App />
    </Provider>
  )

  // Switch to EN first to have a stable starting point
  const enButton = screen.getByText('EN')
  fireEvent.click(enButton)

  // Verify English UI text
  expect(screen.getByText(/Welcome to your AI Avatar/i)).toBeInTheDocument()

  // Switch to TH
  const thButton = screen.getByText('TH')
  fireEvent.click(thButton)

  // Verify Thai UI text
  expect(screen.getByText(/ยินดีต้อนรับสู่ AI Avatar ของคุณ/i)).toBeInTheDocument()
})
