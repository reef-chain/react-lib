# @reef-chain/react-lib

> Reef React Library

[![NPM](https://img.shields.io/npm/v/@reef-chain/react-lib.svg)](https://www.npmjs.com/package/@reef-chain/react-lib) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
yarn add @reef-chain/react-lib
```

## Usage

```tsx
import React, { Component } from 'react'

import { Components } from '@reef-chain/react-lib'
import '@reef-chain/react-lib/dist/index.css'

const { Card, Button } = Components;

const Example = (): JSX.Element => (
  <Card.Card>
    <Card.Header>
      <Card.Title>Hello from the other side!</Card.Title>
      <Button.Back onClick={() => {}} />
    </Card.Header>
  </Card.Card>
)
```

