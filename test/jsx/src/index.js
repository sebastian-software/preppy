/* eslint-disable import/no-unresolved */

import React from "react"
import { FormattedMessage } from "react-intl"
import Header from "components/Header"

export function MyPage() {
  return (
    <>
      <Header>Title</Header>
      <button type="submit">
        <FormattedMessage id="press-button" />
      </button>
    </>
  )
}
