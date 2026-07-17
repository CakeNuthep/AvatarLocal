import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Provider } from 'react-redux'
import { store } from '../src/store'
import AvatarCanvas from '../src/avatar/AvatarCanvas'

test('renders AvatarCanvas component with lighting and postprocessing', () => {
  render(
    <Provider store={store}>
      <AvatarCanvas />
    </Provider>
  )
  expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument()
  expect(screen.getByTestId('effect-composer')).toBeInTheDocument()
  expect(screen.getByTestId('bloom-effect')).toBeInTheDocument()
})
